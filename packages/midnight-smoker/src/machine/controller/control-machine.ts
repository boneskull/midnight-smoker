import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {fromUnknownError} from '#error';
import {SmokerEvent, type EventData} from '#event';
import {
  LoadableComponents,
  LoaderMachine,
  type LoaderMachineOutputOk,
  type PkgManagerInitPayload,
  type ReporterInitPayload,
  type RuleInitPayload,
} from '#machine/loader-machine';
import {PkgManagerMachine} from '#machine/pkg-manager';
import {
  ReporterMachine,
  type ReporterMachineInput,
  type ReporterMachineOutput,
} from '#machine/reporter';
import * as MachineUtil from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginRegistry} from '#plugin';
import {
  type Executor,
  type LintResult,
  type RunScriptResult,
  type SomeReporterDef,
  type SomeRule,
  type StaticPkgManagerSpec,
  type WorkspaceInfo,
} from '#schema';
import {FileManager} from '#util/filemanager';
import {isEmpty, partition} from 'lodash';
import assert from 'node:assert';
import {type PackageJson} from 'type-fest';
import {
  and,
  assign,
  enqueueActions,
  log,
  not,
  sendTo,
  setup,
  type ActorRefFrom,
} from 'xstate';
import {queryWorkspaces, readSmokerPkgJson} from './control-machine-actors';
import type * as Event from './control-machine-events';
import {
  InstallBusMachine,
  type InstallBusMachineEvents,
  type InstallBusMachineInput,
} from './install-bus-machine';
import {
  LintBusMachine,
  type LintBusMachineEvents,
  type LintBusMachineInput,
} from './lint-bus-machine';
import {
  PackBusMachine,
  type PackBusMachineEvents,
  type PackBusMachineInput,
} from './pack-bus-machine';

export type CtrlMachineOutput = CtrlOutputOk | CtrlOutputError;

export type CtrlOutputError = MachineUtil.ActorOutputError<
  Error,
  {
    lintResults?: LintResult[];
    runScriptResults?: RunScriptResult[];
  }
>;

export type CtrlOutputOk = MachineUtil.ActorOutputOk<{
  lintResults?: LintResult[];
  runScriptResults?: RunScriptResult[];
}>;

export interface CtrlMachineContext extends CtrlMachineInput {
  defaultExecutor: Executor;
  error?: Error;
  lingered?: string[];
  fileManager: FileManager;
  lintResults?: LintResult[];
  runScriptResults?: RunScriptResult[];
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  pkgManagerMachineRefs?: Record<
    string,
    ActorRefFrom<typeof PkgManagerMachine>
  >;
  loaderMachineRefs: Record<string, ActorRefFrom<typeof LoaderMachine>>;
  reporterDefs: SomeReporterDef[];
  reporterInitPayloads: ReporterInitPayload[];
  reporterMachineRefs: Record<string, ActorRefFrom<typeof ReporterMachine>>;
  ruleInitPayloads: RuleInitPayload[];
  rules: SomeRule[];
  scripts: string[];
  shouldHalt: boolean;
  shouldLint: boolean;
  smokerPkgJson?: PackageJson;
  startTime: number;
  systemExecutor: Executor;
  totalChecks: number;
  workspaceInfo: WorkspaceInfo[];

  pkgManagerDidPackCount: number;
  pkgManagerDidInstallCount: number;
  pkgManagerDidLintCount: number;
  pkgManagerDidRunScriptsCount: number;

  uniquePkgNames?: string[];
  pkgManagers?: StaticPkgManagerSpec[];

  packBusMachineRef?: ActorRefFrom<typeof PackBusMachine>;
  installBusMachineRef?: ActorRefFrom<typeof InstallBusMachine>;
  lintBusMachineRef?: ActorRefFrom<typeof LintBusMachine>;
}

export interface CtrlMachineInput {
  defaultExecutor?: Executor;
  fileManager?: FileManager;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  systemExecutor?: Executor;
}

function delta(startTime: number): string {
  return ((performance.now() - startTime) / 1000).toFixed(2);
}

export const ControlMachine = setup({
  types: {
    context: {} as CtrlMachineContext,
    emitted: {} as Event.ControlMachineEmitted,
    events: {} as Event.CtrlEvents,
    input: {} as CtrlMachineInput,
    output: {} as CtrlMachineOutput,
  },
  actors: {
    PackBusMachine,
    InstallBusMachine,
    LintBusMachine,
    readSmokerPkgJson,
    queryWorkspaces,
    ReporterMachine,
    PkgManagerMachine,
    LoaderMachine,
  },
  guards: {
    hasPkgManagers: ({context: {pkgManagers}}) => !isEmpty(pkgManagers),
    isPackingComplete: and([
      'hasPkgManagers',
      ({context: {pkgManagerDidPackCount, pkgManagers = []}}) => {
        return pkgManagerDidPackCount === pkgManagers.length;
      },
    ]),
    isInstallationComplete: and([
      'hasPkgManagers',
      'isPackingComplete',
      ({context: {pkgManagerDidInstallCount, pkgManagers = []}}) => {
        return pkgManagerDidInstallCount === pkgManagers.length;
      },
    ]),
    isLintingComplete: and([
      'hasPkgManagers',
      'isInstallationComplete',
      ({context: {pkgManagerDidLintCount, pkgManagers = []}}) => {
        return pkgManagerDidLintCount === pkgManagers.length;
      },
    ]),
    isRunningComplete: and([
      'hasPkgManagers',
      'isInstallationComplete',
      ({context: {pkgManagerDidRunScriptsCount, pkgManagers = []}}) => {
        return pkgManagerDidRunScriptsCount === pkgManagers.length;
      },
    ]),

    hasLingered: ({context: {lingered}}) => !isEmpty(lingered),

    /**
     * If `true`, then the machine has rules to lint against.
     */
    hasRules: ({context: {rules}}) => !isEmpty(rules),

    /**
     * If `true`, then the `LINT` event was received.
     */
    shouldLint: ({context: {shouldLint}}) => shouldLint,

    /**
     * If `true`, then the `HALT` event was received.
     */
    shouldHalt: ({context: {shouldHalt}}) => shouldHalt,

    isWorkComplete: ({context: {pkgManagerMachineRefs}}) =>
      pkgManagerMachineRefs !== undefined && isEmpty(pkgManagerMachineRefs),

    /**
     * If `true`, then one or more custom scripts have been executed.
     */
    hasScriptResults: ({context: {runScriptResults}}) =>
      !isEmpty(runScriptResults),

    /**
     * If `true`, then the `RUN_SCRIPTS` event was received
     */
    shouldRunScripts: ({context: {scripts}}) => !isEmpty(scripts),

    isMachineOutputOk: (_, output: MachineUtil.ActorOutput) =>
      MachineUtil.isActorOutputOk(output),

    isMachineOutputNotOk: (_, output: MachineUtil.ActorOutput): boolean =>
      MachineUtil.isActorOutputNotOk(output),

    hasError: ({context: {error}}) => Boolean(error),

    notHasError: not('hasError'),

    hasReporterRefs: ({context: {reporterMachineRefs}}) =>
      !isEmpty(reporterMachineRefs),
  },
  actions: {
    beginPacking: sendTo(
      ({context: {packBusMachineRef}}) => packBusMachineRef!,
      ({context: {reporterMachineRefs}}) => ({
        type: 'PACK',
        actorIds: Object.keys(reporterMachineRefs),
      }),
    ),
    beginInstalling: sendTo(
      ({context: {installBusMachineRef}}) => installBusMachineRef!,
      ({context: {reporterMachineRefs}}) => ({
        type: 'INSTALL',
        actorIds: Object.keys(reporterMachineRefs),
      }),
    ),
    beginLinting: sendTo(
      ({context: {lintBusMachineRef}}) => lintBusMachineRef!,
      ({context: {reporterMachineRefs}}) => ({
        type: 'LINT',
        actorIds: Object.keys(reporterMachineRefs),
      }),
    ),
    assignSmokerPkgJson: assign({
      smokerPkgJson: (_, smokerPkgJson: PackageJson) => smokerPkgJson,
    }),
    appendLingered: assign({
      lingered: ({context: {lingered = []}}, directory: string) => {
        return [...lingered, directory];
      },
    }),

    /**
     * Spawns a {@link LoaderMachine} for each plugin
     */
    spawnLoaders: assign({
      loaderMachineRefs: ({
        context: {
          pluginRegistry,
          fileManager: fm,
          systemExecutor,
          defaultExecutor,
          smokerOptions,
          workspaceInfo,
        },
        spawn,
      }) =>
        Object.fromEntries(
          pluginRegistry.plugins.map((plugin) => {
            const id = `LoaderMachine.${MachineUtil.makeId()}`;
            const actor = spawn('LoaderMachine', {
              id,
              input: {
                plugin,
                pluginRegistry,
                pkgManager: {
                  fm,
                  cwd: smokerOptions.cwd,
                  systemExecutor,
                  defaultExecutor,
                },
                smokerOptions,
                component: LoadableComponents.All,
                workspaceInfo,
              },
            });

            return [id, MachineUtil.monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),

    /**
     * Stops a given {@link LoaderMachine}
     */
    stopLoader: enqueueActions(
      ({enqueue, context: {loaderMachineRefs}}, id: string) => {
        enqueue.stopChild(id);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = loaderMachineRefs;
        enqueue.assign({
          loaderMachineRefs: rest,
        });
      },
    ),

    flushReporters: enqueueActions(
      ({enqueue, context: {reporterMachineRefs}}) => {
        Object.values(reporterMachineRefs).forEach((reporterMachine) => {
          enqueue.sendTo(reporterMachine, {type: 'HALT'});
        });
      },
    ),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),

    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: RunScriptResult,
      ) => {
        return [...runScriptResults, runScriptResult];
      },
    }),
    stopReporterMachine: enqueueActions(
      (
        {enqueue, context: {reporterMachineRefs: reporterMachines}},
        {output: {id}}: {output: ReporterMachineOutput},
      ) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = reporterMachines;
        enqueue.assign({
          reporterMachineRefs: rest,
        });
      },
    ),
    report: enqueueActions(
      (
        {enqueue, context: {reporterMachineRefs}},
        event: Event.ControlMachineEmitted,
      ) => {
        for (const reporterMachineRef of Object.values(reporterMachineRefs)) {
          enqueue.sendTo(reporterMachineRef, {type: 'EVENT', event});
        }
        enqueue.emit(event);
      },
    ),
    assignScripts: assign({
      scripts: ({context: {scripts = []}}, params: {scripts?: string[]}) => [
        ...scripts,
        ...(params.scripts ?? []),
      ],
    }),

    shouldLint: assign({shouldLint: true}),
    shouldHalt: assign({shouldHalt: true}),

    spawnComponentMachines: assign({
      reporterMachineRefs: ({
        spawn,
        context: {
          reporterMachineRefs,
          smokerOptions,
          reporterInitPayloads,
          smokerPkgJson,
        },
      }) => {
        assert.ok(smokerPkgJson);
        const newRefs = Object.fromEntries(
          reporterInitPayloads.map(({def, plugin}) => {
            const id = `ReporterMachine.${MachineUtil.makeId()}-${plugin.id}/${
              def.name
            }`;
            const input: ReporterMachineInput = {
              def,
              smokerOptions,
              plugin,
              smokerPkgJson,
            };
            const actor = spawn('ReporterMachine', {
              id,
              systemId: id,
              input,
            });
            return [id, MachineUtil.monkeypatchActorLogger(actor, id)];
          }),
        );
        return {...reporterMachineRefs, ...newRefs};
      },
      pkgManagerMachineRefs: ({
        self,
        spawn,
        context: {
          pkgManagerMachineRefs,
          fileManager,
          systemExecutor,
          defaultExecutor,
          workspaceInfo,
          smokerOptions: {
            all,
            workspace,
            rules,
            script: scripts,
            linger,
            add: additionalDeps,
          },
          pkgManagerInitPayloads,
          ruleInitPayloads,
          shouldLint,
          shouldHalt,
        },
      }) => {
        const useWorkspaces = all || !isEmpty(workspace);
        const signal = new AbortController().signal;
        const newRefs = Object.fromEntries(
          pkgManagerInitPayloads.map(({def, spec, plugin}, index) => {
            const executor = spec.isSystem ? systemExecutor : defaultExecutor;
            const id = `PkgManagerMachine.${MachineUtil.makeId()}-${spec}`;
            const actorRef = spawn('PkgManagerMachine', {
              id,
              input: {
                spec,
                def,
                workspaceInfo,
                executor,
                fileManager,
                parentRef: self,
                linger,
                useWorkspaces,
                index: index + 1,
                signal,
                plugin,
                additionalDeps: [...new Set(additionalDeps)],
                scripts,
                ruleConfigs: rules,
                rules: ruleInitPayloads.map(({rule}) => rule),
                shouldLint,
                shouldShutdown: shouldHalt,
              },
            });
            return [id, MachineUtil.monkeypatchActorLogger(actorRef, id)];
          }),
        );
        return {...pkgManagerMachineRefs, ...newRefs};
      },
    }),
    stopPkgManagerMachine: enqueueActions(
      ({enqueue, context: {pkgManagerMachineRefs}}, id: string) => {
        enqueue.stopChild(id);

        assert.ok(pkgManagerMachineRefs);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = pkgManagerMachineRefs;
        enqueue.assign({
          pkgManagerMachineRefs: rest,
        });
      },
    ),
    assignInitPayloads: assign({
      reporterInitPayloads: (
        {context},
        {reporterInitPayloads}: LoaderMachineOutputOk,
      ) => [...context.reporterInitPayloads, ...reporterInitPayloads],
      pkgManagerInitPayloads: (
        {context},
        {pkgManagerInitPayloads}: LoaderMachineOutputOk,
      ) => [...context.pkgManagerInitPayloads, ...pkgManagerInitPayloads],
      ruleInitPayloads: (
        {context},
        {ruleInitPayloads}: LoaderMachineOutputOk,
      ) => [...context.ruleInitPayloads, ...ruleInitPayloads],
      pkgManagers: (_, {pkgManagerInitPayloads}: LoaderMachineOutputOk) =>
        pkgManagerInitPayloads.map(({spec}) => spec.toJSON()),
    }),
    freeInitPayloads: assign({
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
    }),
    freePackBusMachineRef: assign({
      packBusMachineRef: undefined,
    }),
    freeInstallBusMachineRef: assign({
      installBusMachineRef: undefined,
    }),
    freeLintBusMachineRef: assign({
      lintBusMachineRef: undefined,
    }),
    resendPackEvent: sendTo(
      ({context: {packBusMachineRef}}) => packBusMachineRef!,
      (_, event: PackBusMachineEvents) => event,
    ),
    resendInstallEvent: sendTo(
      ({context: {installBusMachineRef}}) => installBusMachineRef!,
      (_, event: InstallBusMachineEvents) => event,
    ),
    resendLintEvent: sendTo(
      ({context: {lintBusMachineRef}}) => lintBusMachineRef!,
      (_, event: LintBusMachineEvents) => event,
    ),
  },
}).createMachine({
  id: 'ControlMachine',
  context: ({
    input: {
      fileManager,
      defaultExecutor,
      systemExecutor,
      smokerOptions,
      ...rest
    },
  }): CtrlMachineContext => {
    defaultExecutor ??= rest.pluginRegistry.getExecutor(DEFAULT_EXECUTOR_ID);
    systemExecutor ??= rest.pluginRegistry.getExecutor(SYSTEM_EXECUTOR_ID);
    fileManager ??= FileManager.create();
    return {
      defaultExecutor,
      systemExecutor,
      fileManager,
      smokerOptions,
      ...rest,
      shouldLint: smokerOptions.lint,
      loaderMachineRefs: {},
      reporterMachineRefs: {},
      reporterDefs: [],
      rules: [],
      scripts: smokerOptions.script,
      totalChecks: 0,
      shouldHalt: false,
      startTime: performance.now(),
      workspaceInfo: [],
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
      pkgManagerDidPackCount: 0,
      pkgManagerDidInstallCount: 0,
      pkgManagerDidLintCount: 0,
      pkgManagerDidRunScriptsCount: 0,
    };
  },
  initial: 'loading',
  entry: [log('starting control machine')],
  exit: [log('stopped')],
  always: {
    guard: 'hasError',
    actions: [log(({context: {error}}) => `ERROR: ${error?.message}`)],
    target: '.shutdown',
  },
  on: {
    HALT: {
      actions: [{type: 'shouldHalt'}],
    },

    'xstate.done.actor.ReporterMachine.*': [
      {
        guard: {
          type: 'isMachineOutputNotOk',
          params: ({event: {output}}) => output,
        },
        actions: [
          {
            type: 'assignError',
            params: ({event: {output}}) => {
              MachineUtil.assertActorOutputNotOk(output);
              return {
                error: output.error,
              };
            },
          },
          {type: 'stopReporterMachine', params: ({event}) => event},
        ],
        target: '#ControlMachine.shutdown',
      },
      {
        guard: {
          type: 'isMachineOutputOk',
          params: ({event: {output}}) => output,
        },
        actions: [
          log(
            ({
              event: {
                output: {id},
              },
            }) => `${id} exited gracefully`,
          ),
          {type: 'stopReporterMachine', params: ({event}) => event},
        ],
      },
    ],

    'xstate.done.actor.PkgManagerMachine.*': {
      actions: [
        {
          type: 'stopPkgManagerMachine',
          params: ({event: {output}}) => output.id,
        },
      ],
    },

    LINGERED: {
      description:
        'Only occurs if the linger flag was true. During its shutdown process, a PkgManagerMachine will emit this event with its tmpdir path',
      actions: [
        {
          type: 'appendLingered',
          params: ({event: {directory}}) => directory,
        },
      ],
    },
  },
  states: {
    loading: {
      entry: [log('loading environment, plugins and components')],
      exit: [log('loading complete')],
      initial: 'queryingWorkspaces',
      states: {
        queryingWorkspaces: {
          invoke: {
            src: 'queryWorkspaces',
            input: ({
              context: {
                smokerOptions: {cwd, all, workspace},
                fileManager,
              },
            }) => ({all, workspace, fileManager, cwd}),
            onDone: {
              actions: [
                assign({
                  workspaceInfo: ({event: {output}}) => output,
                  uniquePkgNames: ({event: {output}}) =>
                    MachineUtil.uniquePkgNames(output),
                }),
                log(({event: {output}}) => `found ${output.length} workspaces`),
              ],
              target: '#ControlMachine.loading.loadingPlugins',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => ({error}),
                },
                log(
                  ({event: {error}}) => `error querying workspaces: ${error}`,
                ),
              ],
              target: '#ControlMachine.shutdown',
            },
          },
        },
        loadingPlugins: {
          entry: [log('loading plugin components...'), {type: 'spawnLoaders'}],
          on: {
            'xstate.done.actor.LoaderMachine.*': [
              {
                guard: {
                  type: 'isMachineOutputOk',
                  params: ({event: {output}}) => output,
                },
                actions: [
                  {
                    type: 'assignInitPayloads',
                    params: ({event: {output}}) => {
                      MachineUtil.assertActorOutputOk(output);
                      return output;
                    },
                  },
                ],
                target: 'spawnWorkers',
              },
              {
                guard: {
                  type: 'isMachineOutputNotOk',
                  params: ({event: {output}}) => output,
                },
                actions: [
                  {
                    type: 'assignError',
                    params: ({event: {output}}) => {
                      MachineUtil.assertActorOutputNotOk(output);
                      return {
                        error: output.error,
                      };
                    },
                  },
                ],
                target: '#ControlMachine.shutdown',
              },
            ],
          },
        },

        spawnWorkers: {
          entry: [
            assign({
              packBusMachineRef: ({
                spawn,
                context: {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                },
                self: parentRef,
              }) => {
                assert.ok(pkgManagers);
                assert.ok(uniquePkgNames);
                const input: PackBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                  parentRef,
                };
                const actor = spawn('PackBusMachine', {
                  input,
                });
                return MachineUtil.monkeypatchActorLogger(
                  actor,
                  'PackBusMachine',
                );
              },
              installBusMachineRef: ({
                spawn,
                context: {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                },
                self: parentRef,
              }) => {
                assert.ok(pkgManagers);
                assert.ok(uniquePkgNames);
                const input: InstallBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                  parentRef,
                };
                const actor = spawn('InstallBusMachine', {
                  input,
                });
                return MachineUtil.monkeypatchActorLogger(
                  actor,
                  'InstallBusMachine',
                );
              },
              lintBusMachineRef: ({
                spawn,
                context: {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                },
                self: parentRef,
              }) => {
                assert.ok(pkgManagers);
                assert.ok(uniquePkgNames);
                const input: LintBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                  parentRef,
                  rules: [],
                };
                const actor = spawn('LintBusMachine', {
                  input,
                });
                return MachineUtil.monkeypatchActorLogger(
                  actor,
                  'LintBusMachine',
                );
              },
            }),
          ],
          always: {
            target: 'spawningComponents',
          },
        },
        spawningComponents: {
          invoke: {
            src: 'readSmokerPkgJson',
            input: ({context: {fileManager}}) => fileManager,
            onDone: {
              actions: [
                {
                  type: 'assignSmokerPkgJson',
                  params: ({event: {output}}) => output,
                },
                {
                  type: 'spawnComponentMachines',
                },
                {
                  type: 'freeInitPayloads',
                },
              ],
              target: 'done',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => ({error}),
                },
                log(
                  ({event: {error}}) =>
                    `error reading smoker package.json: ${error}`,
                ),
              ],
              target: '#ControlMachine.shutdown',
            },
          },
        },
        done: {
          type: 'final',
        },
      },
      onDone: {
        target: '#ControlMachine.working',
      },
    },

    working: {
      entry: [
        {
          type: 'report',
          params: ({
            context: {pluginRegistry, smokerOptions},
          }): EventData<typeof SmokerEvent.SmokeBegin> => ({
            type: SmokerEvent.SmokeBegin,
            plugins: pluginRegistry.plugins.map((plugin) => plugin.toJSON()),
            opts: smokerOptions,
          }),
        },
      ],
      type: 'parallel',
      states: {
        packing: {
          initial: 'working',
          states: {
            working: {
              entry: [
                {
                  type: 'beginPacking',
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
              ],
              exit: [{type: 'freePackBusMachineRef'}],
              on: {
                'PACK.*': {
                  actions: [
                    {
                      type: 'resendPackEvent',
                      params: ({event}) => event,
                    },
                  ],
                },
                PACK_OK: {
                  target: 'done',
                },
                PACK_FAILED: {
                  target: 'errored',
                },
              },
            },
            done: {
              type: MachineUtil.FINAL,
            },
            errored: {
              type: MachineUtil.FINAL,
            },
          },
        },
        installing: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                'PACK.PKG_PACK_OK': {
                  target: 'working',
                },
              },
            },
            working: {
              entry: [
                {
                  type: 'beginInstalling',
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
              ],
              exit: [{type: 'freeInstallBusMachineRef'}],
              on: {
                'INSTALL.*': {
                  actions: [
                    {
                      type: 'resendInstallEvent',
                      params: ({event}) => event,
                    },
                  ],
                },
                [SmokerEvent.InstallOk]: {
                  target: 'done',
                },
                [SmokerEvent.InstallFailed]: {
                  target: 'errored',
                },
              },
            },
            errored: {
              type: MachineUtil.FINAL,
            },
            done: {
              type: MachineUtil.FINAL,
            },
          },
        },

        linting: {
          initial: 'idle',
          states: {
            idle: {
              always: [
                {
                  guard: not('shouldLint'),
                  target: 'done',
                },
              ],
              on: {
                'INSTALL.PKG_INSTALL_OK': {
                  target: 'working',
                },
              },
            },
            working: {
              entry: [
                {
                  type: 'beginLinting',
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
              ],
              exit: [{type: 'freeLintBusMachineRef'}],
              on: {
                'LINT.*': {
                  actions: [
                    {
                      type: 'resendLintEvent',
                      params: ({event}) => event,
                    },
                  ],
                },
                [SmokerEvent.LintOk]: {
                  actions: [log('lint_ok')],
                  target: 'done',
                },
                [SmokerEvent.LintFailed]: {
                  target: 'errored',
                },
              },
            },
            done: {
              type: MachineUtil.FINAL,
            },
            errored: {
              type: MachineUtil.FINAL,
            },
          },
        },
        running: {
          initial: 'idle',
          states: {
            idle: {
              always: [
                {
                  guard: not('shouldRunScripts'),
                  target: 'done',
                },
              ],
              on: {
                'INSTALL.PKG_INSTALL_OK': {
                  target: 'working',
                },
              },
            },
            working: {
              entry: [
                {
                  type: 'report',
                  params: ({
                    context: {scripts, uniquePkgNames = [], pkgManagers = []},
                  }): EventData<typeof SmokerEvent.RunScriptsBegin> => ({
                    type: SmokerEvent.RunScriptsBegin,
                    totalUniquePkgs: uniquePkgNames.length * pkgManagers.length,
                    totalPkgManagers: pkgManagers.length,
                    totalUniqueScripts: scripts.length,
                  }),
                },
              ],

              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
                {
                  guard: 'isRunningComplete',
                  target: 'done',
                },
              ],

              exit: [
                {
                  type: 'report',
                  params: ({
                    context: {runScriptResults, pkgManagers = [], scripts},
                  }): EventData<
                    | typeof SmokerEvent.RunScriptsOk
                    | typeof SmokerEvent.RunScriptsFailed
                  > => {
                    assert.ok(runScriptResults);
                    const [failedResults, otherResults] = partition(
                      runScriptResults,
                      'error',
                    );
                    const failed = failedResults.length;
                    const [skippedResults, passedResults] = partition(
                      otherResults,
                      {
                        skipped: true,
                      },
                    );
                    const passed = passedResults.length;
                    const skipped = skippedResults.length;

                    const type = failed
                      ? SmokerEvent.RunScriptsFailed
                      : SmokerEvent.RunScriptsOk;

                    const pkgNames = new Set<string>();

                    return {
                      type,
                      passed,
                      skipped,
                      failed,
                      totalUniqueScripts: scripts.length,
                      totalUniquePkgs: pkgNames.size,
                      totalPkgManagers: pkgManagers.length,
                      results: runScriptResults,
                    };
                  },
                },
              ],
              on: {
                RUN_SCRIPT_BEGIN: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context,
                        event: {runScriptManifest, pkgManager},
                      }): EventData<typeof SmokerEvent.RunScriptBegin> => ({
                        type: SmokerEvent.RunScriptBegin,
                        totalUniqueScripts: context.scripts.length,
                        pkgManager,
                        manifest: runScriptManifest,
                      }),
                    },
                  ],
                },
                RUN_SCRIPT_FAILED: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context,
                        event: {runScriptManifest, pkgManager, result},
                      }): EventData<typeof SmokerEvent.RunScriptFailed> => {
                        assert.ok(result.error);
                        return {
                          type: SmokerEvent.RunScriptFailed,
                          totalUniqueScripts: context.scripts.length,
                          pkgManager,
                          manifest: runScriptManifest,
                          error: result.error,
                        };
                      },
                    },
                    {
                      type: 'appendRunScriptResult',
                      params: ({
                        event: {
                          result: {error},
                        },
                      }) => ({
                        error,
                      }),
                    },
                  ],
                },
                RUN_SCRIPT_SKIPPED: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context,
                        event: {runScriptManifest, pkgManager},
                      }): EventData<typeof SmokerEvent.RunScriptSkipped> => ({
                        type: SmokerEvent.RunScriptSkipped,
                        totalUniqueScripts: context.scripts.length,
                        pkgManager,
                        skipped: true,
                        manifest: runScriptManifest,
                      }),
                    },
                    {
                      type: 'appendRunScriptResult',
                      params: {skipped: true},
                    },
                  ],
                },
                RUN_SCRIPT_OK: [
                  {
                    actions: [
                      {
                        type: 'report',
                        params: ({
                          context,
                          event: {runScriptManifest, pkgManager, result},
                        }): EventData<typeof SmokerEvent.RunScriptOk> => {
                          assert.ok(result.rawResult);
                          return {
                            type: SmokerEvent.RunScriptOk,
                            totalUniqueScripts: context.scripts.length,
                            pkgManager,
                            manifest: runScriptManifest,
                            rawResult: result.rawResult,
                          };
                        },
                      },
                      {
                        type: 'appendRunScriptResult',
                        params: ({
                          event: {
                            result: {rawResult},
                          },
                        }) => ({
                          rawResult,
                        }),
                      },
                    ],
                  },
                ],
                PKG_MANAGER_RUN_SCRIPTS_BEGIN: [
                  {
                    actions: [
                      {
                        type: 'report',
                        params: ({
                          context: {
                            pkgManagers = [],
                            scripts,
                            uniquePkgNames = [],
                          },
                          event: {pkgManager, manifests},
                        }): EventData<
                          typeof SmokerEvent.PkgManagerRunScriptsBegin
                        > => {
                          return {
                            manifests,
                            type: SmokerEvent.PkgManagerRunScriptsBegin,
                            pkgManager,
                            totalPkgManagers: pkgManagers.length,
                            totalUniqueScripts: scripts.length,
                            totalUniquePkgs: uniquePkgNames.length,
                          };
                        },
                      },
                    ],
                  },
                ],
                PKG_MANAGER_RUN_SCRIPTS_OK: {
                  actions: [
                    assign({
                      pkgManagerDidRunScriptsCount: ({
                        context: {pkgManagerDidRunScriptsCount},
                      }) => {
                        return pkgManagerDidRunScriptsCount + 1;
                      },
                    }),
                    {
                      type: 'report',
                      params: ({
                        context: {pkgManagers = [], scripts, workspaceInfo},
                        event,
                      }): EventData<
                        typeof SmokerEvent.PkgManagerRunScriptsOk
                      > => {
                        return {
                          ...event,
                          type: SmokerEvent.PkgManagerRunScriptsOk,
                          totalPkgManagers: pkgManagers.length,
                          totalUniqueScripts: scripts.length,
                          totalUniquePkgs:
                            MachineUtil.uniquePkgNames(workspaceInfo).length,
                        };
                      },
                    },
                  ],
                },
                PKG_MANAGER_RUN_SCRIPTS_FAILED: {
                  actions: [
                    assign({
                      pkgManagerDidRunScriptsCount: ({
                        context: {pkgManagerDidRunScriptsCount},
                      }) => {
                        return pkgManagerDidRunScriptsCount + 1;
                      },
                    }),
                    {
                      type: 'report',
                      params: ({
                        context: {pkgManagers = [], scripts, workspaceInfo},
                        event,
                      }): EventData<
                        typeof SmokerEvent.PkgManagerRunScriptsFailed
                      > => {
                        return {
                          ...event,
                          type: SmokerEvent.PkgManagerRunScriptsFailed,
                          totalPkgManagers: pkgManagers.length,
                          totalUniqueScripts: scripts.length,
                          totalUniquePkgs:
                            MachineUtil.uniquePkgNames(workspaceInfo).length,
                        };
                      },
                    },
                  ],
                },
              },
            },
            done: {
              type: MachineUtil.FINAL,
            },
            errored: {
              type: MachineUtil.FINAL,
            },
          },
        },
      },
      always: [
        {
          // we halt when 1. the shouldHalt flag is true, and 2. when all pkg managers have shut themselves down.
          guard: and(['shouldHalt', 'isWorkComplete']),
          target: '#ControlMachine.shutdown',
        },
      ],
    },
    shutdown: {
      description: 'Graceful shutdown process',
      initial: 'idle',
      states: {
        idle: {
          description:
            'Determines whether or not to report a lingering temp dir',
          always: [
            {
              guard: {type: 'hasLingered'},
              target: 'reportLingered',
            },
            {
              guard: not('hasLingered'),
              target: 'beforeExit',
            },
          ],
        },
        reportLingered: {
          always: {
            actions: [
              {
                type: 'report',
                params: ({
                  context: {lingered},
                }): EventData<typeof SmokerEvent.Lingered> => {
                  assert.ok(lingered);
                  return {type: SmokerEvent.Lingered, directories: lingered};
                },
              },
            ],
            target: 'beforeExit',
          },
        },
        beforeExit: {
          entry: [
            {
              type: 'report',
              params: {type: SmokerEvent.BeforeExit},
            },
            {
              type: 'flushReporters',
            },
          ],
          always: [
            {
              guard: and(['hasError', not('hasReporterRefs')]),
              target: 'errored',
            },
            {
              guard: and(['notHasError', not('hasReporterRefs')]),
              target: 'complete',
            },
          ],
        },
        errored: {
          entry: [
            log(
              ({context: {startTime}}) =>
                `complete (with error) in ${delta(startTime)}s`,
            ),
          ],
          type: 'final',
        },
        complete: {
          entry: [
            log(({context: {startTime}}) => `complete in ${delta(startTime)}s`),
          ],
          type: 'final',
        },
      },
      onDone: {
        target: 'stopped',
      },
    },
    stopped: {
      type: 'final',
    },
  },
  output: ({
    self: {id},
    context: {error, lintResults, runScriptResults},
  }): CtrlMachineOutput =>
    error
      ? {type: MachineUtil.ERROR, id, error, lintResults, runScriptResults}
      : {type: MachineUtil.OK, id, lintResults, runScriptResults},
});
