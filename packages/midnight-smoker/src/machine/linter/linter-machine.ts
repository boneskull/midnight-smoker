import {fromUnknownError} from '#error';
import {
  RuleContext,
  type RuleOk,
  type SomeRule,
  type SomeRuleConfig,
  type StaticRule,
  type StaticRuleIssue,
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
  makeId,
  monkeypatchActorLogger,
  type MachineOutputError,
  type MachineOutputOk,
} from '../machine-util';
import type * as PMMEvents from '../pkg-manager/pkg-manager-machine-events';
import {LintMachine, type LMOutput} from './lint-machine';

export interface LinterMachineInput {
  ruleConfig: SomeRuleConfig;
  rule: SomeRule;

  lintManifests: LintManifests;
  parentRef: AnyActorRef;

  fileManager: FileManager;

  index: number;
}

export interface LinterMachineContext extends LinterMachineInput {
  lintManifestsWithPkgs: LintManifestWithPkg[];
  ruleContexts: Readonly<RuleContext>[];
  staticRule: StaticRule;
  passed: RuleOk[];
  issues: StaticRuleIssue[];

  lintMachines: Record<string, ActorRefFrom<typeof LintMachine>>;
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
  type: 'xstate.done.actor.lintMachine.*';
  output: LMOutput;
}

export type LinterMachineEvents = LinterMachineLintDoneEvent;

export type LinterMachineOutputOk = MachineOutputOk<LintResult>;

export type LinterMachineOutputError = MachineOutputError;

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
      issues: ({context: {issues}}, output: LMOutput): StaticRuleIssue[] => [
        ...issues,
        ...output.issues,
      ],
      passed: ({context: {passed, staticRule}}, {ctx}: LMOutput): RuleOk[] => {
        const ruleOk: RuleOk = {
          rule: staticRule,
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
        context: {
          rule,
          ruleConfig: {severity},
          lintManifestsWithPkgs,
        },
      }): Readonly<RuleContext>[] =>
        lintManifestsWithPkgs.map(
          ({pkgName, installPath, pkgJson, pkgJsonPath}) =>
            RuleContext.create(rule, {
              pkgName,
              severity,
              installPath,
              pkgJson,
              pkgJsonPath,
            }),
        ),
    }),
    spawnLintMachines: assign({
      lintMachines: ({
        context: {ruleContexts, rule, ruleConfig, index: ruleIndex},
        spawn,
      }): Record<string, ActorRefFrom<typeof LintMachine>> =>
        Object.fromEntries(
          ruleContexts.map((ruleContext, lintIndex) => {
            const id = `lintMachine.${makeId()}`;
            const actor = spawn('lintMachine', {
              id,
              input: {
                ctx: ruleContext,
                rule,
                config: ruleConfig,
                index: ruleIndex * (lintIndex + 1),
              },
            });

            return [id, monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),
    sendRuleFailed: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context: {ruleConfig: config, staticRule, index}},
        {issues, ctx: {pkgName, installPath}}: LMOutput,
      ): PMMEvents.PMMRuleFailedEvent => ({
        pkgName,
        installPath,
        config,
        rule: staticRule,
        current: index,
        type: 'RULE_FAILED',
        issues,
      }),
    ),
    sendRuleOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context: {ruleConfig: config, staticRule, index}},
        {ctx: {pkgName, installPath}}: LMOutput,
      ): PMMEvents.PMMRuleOkEvent => ({
        pkgName,
        installPath,
        config,
        rule: staticRule,
        current: index,
        type: 'RULE_OK',
      }),
    ),
    stopLintMachine: enqueueActions(
      ({enqueue, context: {lintMachines}}, {id}: LMOutput) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = lintMachines;
        enqueue.assign({
          lintMachines: rest,
        });
      },
    ),
  },
  actors: {
    lintMachine: LintMachine,

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
          lintManifests.map(async ({installPath, pkgName}) => {
            const {packageJson: pkgJson, path: pkgJsonPath} =
              await fileManager.findPkgUp(installPath, {strict: true});
            return {installPath, pkgName, pkgJson, pkgJsonPath};
          }),
        ),
    ),
  },
  guards: {
    didRuleCheckFail: (_, {issues = []}: {issues: StaticRuleIssue[]}) =>
      !isEmpty(issues),
    didRuleCheckPass: (_, {issues = []}: {issues: StaticRuleIssue[]}) =>
      isEmpty(issues),
  },
}).createMachine({
  context: ({input}): LinterMachineContext => ({
    ...input,
    ruleContexts: [],
    lintManifestsWithPkgs: [],
    passed: [],
    issues: [],
    staticRule: input.rule.toJSON(),
    lintMachines: {},
  }),
  initial: 'setup',
  id: 'RuleMachine',
  states: {
    setup: {
      initial: 'readingPackages',
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
              target: '#RuleMachine.errored',
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
      on: {
        entry: [{type: 'spawnLintMachines'}],
        'xstate.done.actor.lintMachine.*': [
          {
            actions: [
              {
                type: 'assignResult',
                params: ({event}) => event.output,
              },
              {
                type: 'stopLintMachine',
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
      },
    },
    errored: {
      type: 'final',
      entry: [log('errored out')],
    },
    done: {
      type: 'final',
    },
  },
  output: ({
    context: {passed, issues, error},
    self: {id},
  }): LinterMachineOutput =>
    error
      ? {type: 'ERROR', id, error}
      : {
          type: 'OK',
          id,
          passed,
          issues,
        },
});
