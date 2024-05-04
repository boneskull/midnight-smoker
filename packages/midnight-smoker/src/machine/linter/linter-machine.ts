import {fromUnknownError} from '#error';
import {
  RuleContext,
  type RuleResultFailed,
  type RuleResultOk,
  type StaticRuleContext,
} from '#rule';
import {isEmpty} from 'lodash';
import {
  assign,
  enqueueActions,
  fromPromise,
  log,
  sendTo,
  setup,
  type ActorRefFrom,
} from 'xstate';
import {
  type CtrlPkgManagerLintBeginEvent,
  type CtrlRuleBeginEvent,
  type CtrlRuleFailedEvent,
  type CtrlRuleOkEvent,
} from '../controller/control-machine-events';
import {makeId, monkeypatchActorLogger} from '../util';
import {type LinterMachineEvents} from './linter-machine-events';
import {
  type LintManifestWithPkg,
  type LinterMachineContext,
  type LinterMachineInput,
  type LinterMachineOutput,
  type ReadPkgJsonsInput,
} from './linter-machine-types';
import {RuleMachine} from './rule-machine';
import {type RuleMachineOutput} from './rule-machine-types';

export const LinterMachine = setup({
  types: {
    input: {} as LinterMachineInput,
    context: {} as LinterMachineContext,
    events: {} as LinterMachineEvents,
    output: {} as LinterMachineOutput,
  },
  actions: {
    assignResult: assign({
      issues: (
        {context: {issues}},
        output: RuleMachineOutput,
      ): RuleResultFailed[] => [...issues, ...output.issues],
      passed: (
        {context: {passed}},
        {ctx, rule}: RuleMachineOutput,
      ): RuleResultOk[] => {
        const ruleOk: RuleResultOk = {
          rule,
          context: ctx,
        };
        return [...passed, ruleOk];
      },
    }),
    assignLintManifestWithPkgs: assign({
      lintManifestsWithPkgs: (
        {context: {lintManifestsWithPkgs: lintManifestWithPkgs}},
        input: {lintManifestsWithPkgs: LintManifestWithPkg[]},
      ): LintManifestWithPkg[] => [
        ...lintManifestWithPkgs,
        ...input.lintManifestsWithPkgs,
      ],
    }),
    createRuleContexts: assign({
      ruleContexts: ({
        context: {rules, ruleConfigs, lintManifestsWithPkgs, pkgManager},
      }): Readonly<RuleContext>[] =>
        lintManifestsWithPkgs.flatMap(
          ({pkgName, installPath, pkgJson, pkgJsonPath, localPath}) =>
            rules.map((rule) => {
              const {severity} = ruleConfigs[rule.name];
              return RuleContext.create(rule, {
                localPath,
                pkgName,
                severity,
                installPath,
                pkgJson,
                pkgJsonPath,
                pkgManager: `${pkgManager.spec}`,
              });
            }),
        ),
    }),
    spawnRuleMachines: assign({
      ruleMachines: ({
        self,
        context: {ruleContexts, ruleConfigs, index: pkgManagerIndex},
        spawn,
      }): Record<string, ActorRefFrom<typeof RuleMachine>> =>
        Object.fromEntries(
          ruleContexts.map((ruleContext, ruleIndex) => {
            const id = `RuleMachine.${makeId()}`;
            const actor = spawn('RuleMachine', {
              id,
              input: {
                parentRef: self,
                ctx: ruleContext,
                rule: ruleContext.rule,
                config: ruleConfigs[ruleContext.ruleName],
                index: pkgManagerIndex * (ruleIndex + 1),
              },
            });

            return [id, monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),
    sendRuleFailed: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self, context: {pkgManager, ruleConfigs}},
        {
          issues,
          ctx: {ruleName, pkgName, installPath, localPath},
          index: currentRule,
        }: RuleMachineOutput,
      ): CtrlRuleFailedEvent => ({
        pkgManager: pkgManager.staticSpec,
        pkgName,
        installPath,
        localPath,
        config: ruleConfigs[ruleName],
        rule: ruleName,
        type: 'RULE_FAILED',
        sender: self.id,
        issues,
      }),
    ),
    sendRuleOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self, context: {pkgManager, ruleConfigs}},
        {
          ctx: {ruleName, pkgName, installPath, localPath},
          index: currentRule,
        }: RuleMachineOutput,
      ): CtrlRuleOkEvent => ({
        pkgName,
        pkgManager: pkgManager.staticSpec,
        installPath,
        config: ruleConfigs[ruleName],
        rule: ruleName,
        type: 'RULE_OK',
        sender: self.id,
        localPath,
      }),
    ),
    sendRuleBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self, context: {pkgManager, ruleConfigs}},
        {
          currentRule,
          ctx: {pkgName, installPath, ruleName, localPath},
        }: {currentRule: number; ctx: StaticRuleContext},
      ): CtrlRuleBeginEvent => ({
        pkgName,
        pkgManager: pkgManager.staticSpec,
        installPath,
        config: ruleConfigs[ruleName],
        rule: ruleName,
        type: 'RULE_BEGIN',
        sender: self.id,
        localPath,
      }),
    ),
    sendPkgManagerLintBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {index: currentPkgManager, pkgManager, lintManifests},
        self,
      }): CtrlPkgManagerLintBeginEvent => ({
        type: 'PKG_MANAGER_LINT_BEGIN',
        pkgManager: pkgManager.staticSpec,
        sender: self.id,
      }),
    ),
    stopRuleMachine: enqueueActions(
      ({enqueue, context: {ruleMachines}}, {id}: RuleMachineOutput) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = ruleMachines;
        enqueue.assign({
          ruleMachines: rest,
        });
      },
    ),
  },
  actors: {
    RuleMachine,

    /**
     * For each {@link LintManifest}, find a `package.json` in its `installPath`,
     * and read it.
     *
     * The result is merged w/ `LintManifest`, which will be used to create a
     * {@link RuleContext}
     */
    readPkgJsons: fromPromise<LintManifestWithPkg[], ReadPkgJsonsInput>(
      async ({input: {fileManager, lintManifests}}) =>
        Promise.all(
          lintManifests.map(async ({installPath, pkgName, localPath}) => {
            const {packageJson: pkgJson, path: pkgJsonPath} =
              await fileManager.findPkgUp(installPath, {strict: true});
            return {installPath, pkgName, pkgJson, pkgJsonPath, localPath};
          }),
        ),
    ),
  },
  guards: {
    didRuleCheckFail: (_, {issues = []}: {issues: RuleResultFailed[]}) =>
      !isEmpty(issues),
    didRuleCheckPass: (_, {issues = []}: {issues: RuleResultFailed[]}) =>
      isEmpty(issues),
    hasError: ({context: {error}}) => Boolean(error),
  },
}).createMachine({
  context: ({input}): LinterMachineContext => ({
    ...input,
    ruleContexts: [],
    lintManifestsWithPkgs: [],
    passed: [],
    issues: [],
    ruleMachines: {},
  }),
  initial: 'setup',
  id: 'LinterMachine',
  always: {
    guard: {type: 'hasError'},
    actions: [log(({context: {error}}) => `ERROR: ${error?.message}`)],
  },
  states: {
    setup: {
      initial: 'readingPackages',
      entry: [
        {
          type: 'sendPkgManagerLintBegin',
        },
      ],
      states: {
        readingPackages: {
          invoke: {
            src: 'readPkgJsons',
            input: ({
              context: {fileManager, lintManifests},
            }): ReadPkgJsonsInput => ({
              fileManager,
              lintManifests,
            }),
            onDone: {
              actions: {
                type: 'assignLintManifestWithPkgs',
                params: ({event: {output: lintManifestsWithPkgs}}) => ({
                  lintManifestsWithPkgs,
                }),
              },
              target: 'creatingRuleContexts',
            },
            onError: {
              actions: [
                assign({
                  error: ({event: {error}}) => fromUnknownError(error),
                }),
              ],
              target: '#LinterMachine.errored',
            },
          },
        },
        creatingRuleContexts: {
          type: 'final',
          entry: [{type: 'createRuleContexts'}],
        },
      },
      onDone: {
        target: 'lint',
      },
    },
    lint: {
      entry: [
        log(
          ({context: {ruleContexts}}) =>
            `Spawning ${ruleContexts.length} RuleMachine(s)`,
        ),
        {type: 'spawnRuleMachines'},
      ],
      on: {
        'xstate.done.actor.RuleMachine.*': [
          {
            actions: [
              {
                type: 'assignResult',
                params: ({event}) => event.output,
              },
              {
                type: 'stopRuleMachine',
                params: ({event}) => event.output,
              },
            ],
          },
          {
            guard: {
              type: 'didRuleCheckFail',
              params: ({
                event: {
                  output: {issues},
                },
              }) => ({issues}),
            },
            actions: [
              {
                type: 'sendRuleFailed',
                params: ({event: {output}}) => output,
              },
            ],
          },
          {
            guard: {
              type: 'didRuleCheckPass',
              params: ({
                event: {
                  output: {issues},
                },
              }) => ({issues}),
            },
            actions: [
              {
                type: 'sendRuleOk',
                params: ({event: {output}}) => output,
              },
            ],
          },
        ],

        RULE_BEGIN: {
          actions: [
            {
              type: 'sendRuleBegin',
              params: ({event: {index, ctx}}) => ({currentRule: index, ctx}),
            },
          ],
        },
      },
      always: [
        {
          guard: ({context: {error}}) => Boolean(error),
          target: 'errored',
        },
        {
          guard: ({context: {ruleMachines}}) => isEmpty(ruleMachines),
          target: 'done',
        },
      ],
    },
    errored: {
      type: 'final',
      entry: [log('errored out')],
    },
    done: {
      entry: log('linting complete'),
      type: 'final',
    },
  },
  output: ({
    context: {workspaceInfo, passed, issues, error, pkgManager, index},
    self: {id},
  }): LinterMachineOutput =>
    error
      ? {type: 'ERROR', id, error, pkgManager, workspaceInfo}
      : {
          type: 'OK',
          id,
          pkgManagerIndex: index,
          pkgManager,
          lintResult: {passed, issues},
          didFail: Boolean(issues.length),
          workspaceInfo,
        },
});
