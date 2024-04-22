import {fromUnknownError} from '#error';
import {type PkgManager} from '#pkg-manager';
import {
  RuleContext,
  type BaseNormalizedRuleOptionsRecord,
  type RuleResultFailed,
  type RuleResultOk,
  type SomeRule,
  type StaticRuleContext,
} from '#rule';
import {type LintManifest, type LintManifests, type LintResult} from '#schema';
import {type FileManager} from '#util/filemanager';
import {isEmpty} from 'lodash';
import {type PackageJson} from 'type-fest';
import {
  assign,
  enqueueActions,
  fromPromise,
  log,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {
  type CtrlPkgManagerLintBeginEvent,
  type CtrlRuleBeginEvent,
  type CtrlRuleFailedEvent,
  type CtrlRuleOkEvent,
} from '../controller/control-machine-events';
import {
  makeId,
  monkeypatchActorLogger,
  type MachineOutputError,
  type MachineOutputOk,
} from '../util';
import {RuleMachine, type RuleMachineOutput} from './rule-machine';

export interface LinterMachineInput {
  ruleConfigs: BaseNormalizedRuleOptionsRecord;
  rules: SomeRule[];
  pkgManager: PkgManager;
  lintManifests: LintManifests;
  parentRef: AnyActorRef;

  fileManager: FileManager;

  index: number;
}

export interface LinterMachineContext extends LinterMachineInput {
  lintManifestsWithPkgs: LintManifestWithPkg[];
  ruleContexts: Readonly<RuleContext>[];
  passed: RuleResultOk[];
  issues: RuleResultFailed[];

  ruleMachines: Record<string, ActorRefFrom<typeof RuleMachine>>;
  error?: Error;
}

export type ReadPkgJsonsInput = Pick<
  LinterMachineContext,
  'fileManager' | 'lintManifests'
>;

export interface LintManifestWithPkg extends LintManifest {
  pkgJson: PackageJson;
  pkgJsonPath: string;
}

export interface LinterMachineLintDoneEvent {
  type: 'xstate.done.actor.RuleMachine.*';
  output: RuleMachineOutput;
}

export interface LinterMachineRuleBeginEvent {
  type: 'RULE_BEGIN';
  index: number;
  ctx: StaticRuleContext;
  sender: string;
}

export type LinterMachineEvents =
  | LinterMachineLintDoneEvent
  | LinterMachineRuleBeginEvent;

export type LinterMachineOutputOk = MachineOutputOk<{
  lintResult: LintResult;
  pkgManagerIndex: number;
  pkgManager: PkgManager;
  didFail: boolean;
}>;

export type LinterMachineOutputError = MachineOutputError<
  Error,
  {
    pkgManager: PkgManager;
  }
>;

export type LinterMachineOutput =
  | LinterMachineOutputOk
  | LinterMachineOutputError;

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
        currentRule,
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
        currentRule,
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
        currentRule,
        type: 'RULE_BEGIN',
        sender: self.id,
        localPath,
      }),
    ),
    sendPkgManagerLintBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {index: currentPkgManager, pkgManager},
        self,
      }): CtrlPkgManagerLintBeginEvent => ({
        type: 'PKG_MANAGER_LINT_BEGIN',
        currentPkgManager,
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
    context: {passed, issues, error, pkgManager, index},
    self: {id},
  }): LinterMachineOutput =>
    error
      ? {type: 'ERROR', id, error, pkgManager}
      : {
          type: 'OK',
          id,
          pkgManagerIndex: index,
          pkgManager,
          lintResult: {passed, issues},
          didFail: Boolean(issues.length),
        },
});
