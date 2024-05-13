import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {
  fromUnknownError,
  type InstallError,
  type PackError,
  type PackParseError,
} from '#error';
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
  type LintResultOk,
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
  setup,
  type ActorRefFrom,
} from 'xstate';
import {queryWorkspaces, readSmokerPkgJson} from './control-machine-actors';
import type * as Event from './control-machine-events';

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

    hasNoPkgManagerMachineRefs: ({context: {pkgManagerMachineRefs}}) =>
      pkgManagerMachineRefs !== undefined && isEmpty(pkgManagerMachineRefs),

    /**
     * If `true`, then no custom scripts have been executed.
     */
    hasNoScriptResults: not('hasScriptResults'),

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
    appendLingered: assign({
      lingered: ({context: {lingered = []}}, directory: string) => {
        return [...lingered, directory];
      },
    }),
    appendLintResults: assign({
      lintResults: ({context: {lintResults = []}}, results: LintResult[]) => {
        return [...lintResults, ...results];
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
        self,
        spawn,
        context: {
          reporterMachineRefs,
          smokerOptions,
          reporterInitPayloads,
          smokerPkgJson,
        },
      }) => {
        const newRefs = Object.fromEntries(
          reporterInitPayloads.map(({def, plugin}) => {
            const id = `ReporterMachine.${MachineUtil.makeId()}-${plugin.id}/${
              def.name
            }`;
            const input: ReporterMachineInput = {
              // @ts-expect-error https://github.com/statelyai/xstate/blob/main/packages/core/src/types.ts#L114 -- no TEmitted
              emitter: self,
              def,
              smokerOptions,
              plugin,
              smokerPkgJson: smokerPkgJson!,
            };
            const actor = spawn('ReporterMachine', {
              id,
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
  },
  on: {
    RUN_SCRIPTS: {
      guard: {type: 'hasNoScriptResults'},
      actions: [
        {
          type: 'assignScripts',
          params: ({event: {scripts}}) => ({scripts}),
        },
        log('will run scripts'),
      ],
    },

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
                target: 'spawningComponents',
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
        spawningComponents: {
          invoke: {
            src: 'readSmokerPkgJson',
            input: ({context: {fileManager}}) => fileManager,
            onDone: {
              actions: [
                assign({
                  smokerPkgJson: ({event: {output}}) => output,
                }),
                {
                  type: 'spawnComponentMachines',
                },
                assign({
                  pkgManagerInitPayloads: [],
                  reporterInitPayloads: [],
                  ruleInitPayloads: [],
                }),
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
        installing: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                PKG_PACK_OK: {
                  target: 'working',
                },
              },
            },
            working: {
              entry: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      smokerOptions: {add: additionalDeps = []},
                      pkgManagers = [],
                      uniquePkgNames: uniquePkgs = [],
                      workspaceInfo,
                    },
                  }): EventData<typeof SmokerEvent.InstallBegin> => {
                    return {
                      type: SmokerEvent.InstallBegin,
                      uniquePkgs,
                      pkgManagers,
                      additionalDeps,
                      totalPkgs: pkgManagers.length * workspaceInfo.length,
                    };
                  },
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
                {
                  guard: 'isInstallationComplete',
                  target: 'done',
                },
              ],
              on: {
                PKG_INSTALL_BEGIN: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {
                          workspaceInfo: {length: totalPkgs},
                        },
                        event,
                      }): EventData<typeof SmokerEvent.PkgInstallBegin> => ({
                        totalPkgs,
                        ...event,
                        type: SmokerEvent.PkgInstallBegin,
                      }),
                    },
                  ],
                },
                PKG_INSTALL_OK: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {
                          workspaceInfo: {length: totalPkgs},
                        },
                        event,
                      }): EventData<typeof SmokerEvent.PkgInstallOk> => ({
                        totalPkgs,
                        ...event,
                        type: SmokerEvent.PkgInstallOk,
                      }),
                    },
                  ],
                },
                PKG_INSTALL_FAILED: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {
                          workspaceInfo: {length: totalPkgs},
                        },
                        event,
                      }): EventData<typeof SmokerEvent.PkgInstallFailed> => {
                        return {
                          ...event,
                          type: SmokerEvent.PkgInstallFailed,
                          totalPkgs,
                        };
                      },
                    },
                    // TODO: abort
                  ],
                },
                PKG_MANAGER_INSTALL_BEGIN: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {pkgManagers = []},
                        event: {pkgManager, installManifests},
                      }): EventData<
                        typeof SmokerEvent.PkgManagerInstallBegin
                      > => ({
                        type: SmokerEvent.PkgManagerInstallBegin,
                        pkgManager,
                        manifests: installManifests,
                        totalPkgs: installManifests.length, // TODO is this right?
                        totalPkgManagers: pkgManagers.length,
                      }),
                    },
                  ],
                },
                PKG_MANAGER_INSTALL_OK: {
                  actions: [
                    assign({
                      pkgManagerDidInstallCount: ({
                        context: {pkgManagerDidInstallCount},
                      }) => {
                        return pkgManagerDidInstallCount + 1;
                      },
                    }),
                    {
                      type: 'report',
                      params: ({
                        context: {pkgManagers = []},
                        event: {pkgManager, installManifests},
                      }): EventData<
                        typeof SmokerEvent.PkgManagerInstallOk
                      > => ({
                        type: SmokerEvent.PkgManagerInstallOk,
                        manifests: installManifests,
                        pkgManager,
                        totalPkgs: installManifests.length,
                        totalPkgManagers: pkgManagers.length,
                      }),
                    },
                  ],
                },
                PKG_MANAGER_INSTALL_FAILED: {
                  actions: [
                    assign({
                      pkgManagerDidInstallCount: ({
                        context: {pkgManagerDidInstallCount},
                      }) => {
                        return pkgManagerDidInstallCount + 1;
                      },
                    }),
                    {
                      type: 'report',
                      params: ({
                        context: {pkgManagers = []},
                        event: {pkgManager, installManifests, error},
                      }): EventData<
                        typeof SmokerEvent.PkgManagerInstallFailed
                      > => ({
                        type: SmokerEvent.PkgManagerInstallFailed,
                        manifests: installManifests,
                        pkgManager,
                        error,
                        totalPkgs: installManifests.length,
                        totalPkgManagers: pkgManagers.length,
                      }),
                    },
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                },
              },
              exit: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      error,
                      pkgManagers = [],
                      uniquePkgNames: uniquePkgs = [],
                      smokerOptions: {add: additionalDeps = []},
                      workspaceInfo,
                    },
                  }):
                    | EventData<typeof SmokerEvent.InstallOk>
                    | EventData<typeof SmokerEvent.InstallFailed> =>
                    error
                      ? {
                          type: SmokerEvent.InstallFailed,
                          error: error as InstallError,
                          uniquePkgs,
                          pkgManagers,
                          additionalDeps,
                          totalPkgs: pkgManagers.length * workspaceInfo.length,
                        }
                      : {
                          type: SmokerEvent.InstallOk,
                          uniquePkgs,
                          pkgManagers,
                          additionalDeps,
                          totalPkgs: pkgManagers.length * workspaceInfo.length,
                        },
                },
              ],
            },
            errored: {
              type: MachineUtil.FINAL,
            },
            done: {
              type: MachineUtil.FINAL,
            },
          },
        },
        packing: {
          initial: 'working',
          states: {
            working: {
              entry: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      pkgManagers = [],
                      workspaceInfo,
                      smokerOptions,
                      uniquePkgNames: uniquePkgs = [],
                    },
                  }): EventData<typeof SmokerEvent.PackBegin> => ({
                    type: SmokerEvent.PackBegin,
                    packOptions: {
                      cwd: smokerOptions.cwd,
                      allWorkspaces: smokerOptions.all,
                      workspaces: smokerOptions.workspace,
                    },
                    pkgManagers,
                    totalPkgs: workspaceInfo.length * pkgManagers.length,
                    uniquePkgs,
                    workspaceInfo,
                  }),
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
                {
                  guard: 'isPackingComplete',
                  target: 'done',
                },
              ],
              on: {
                PKG_PACK_BEGIN: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {
                          workspaceInfo: {length: totalPkgs},
                        },
                        event,
                      }): EventData<typeof SmokerEvent.PkgPackBegin> => ({
                        totalPkgs,
                        ...event,
                        type: SmokerEvent.PkgPackBegin,
                      }),
                    },
                  ],
                },
                PKG_PACK_OK: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {
                          workspaceInfo: {length: totalPkgs},
                        },
                        event,
                      }): EventData<typeof SmokerEvent.PkgPackOk> => ({
                        totalPkgs,
                        ...event,
                        type: SmokerEvent.PkgPackOk,
                      }),
                    },
                  ],
                },
                PKG_PACK_FAILED: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {
                          workspaceInfo: {length: totalPkgs},
                        },
                        event,
                      }): EventData<typeof SmokerEvent.PkgPackFailed> => {
                        return {
                          ...event,
                          type: SmokerEvent.PkgPackFailed,
                          totalPkgs,
                        };
                      },
                    },
                    // TODO: abort
                  ],
                },
                PKG_MANAGER_PACK_BEGIN: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {
                          pkgManagers = [],
                          smokerOptions: {
                            cwd,
                            all: allWorkspaces,
                            workspace: workspaces,
                          },
                          workspaceInfo,
                        },
                        event: {pkgManager},
                      }): EventData<
                        typeof SmokerEvent.PkgManagerPackBegin
                      > => ({
                        type: SmokerEvent.PkgManagerPackBegin,
                        pkgManager,
                        packOptions: {
                          cwd,
                          allWorkspaces,
                          // includeWorkspaceRoot,
                          workspaces,
                        },
                        totalPkgManagers: pkgManagers.length,
                        workspaceInfo,
                      }),
                    },
                  ],
                },
                PKG_MANAGER_PACK_OK: {
                  actions: [
                    assign({
                      pkgManagerDidPackCount: ({
                        context: {pkgManagerDidPackCount},
                      }) => {
                        return pkgManagerDidPackCount + 1;
                      },
                    }),
                    {
                      type: 'report',
                      params: ({
                        context: {
                          pkgManagers = [],
                          smokerOptions: {
                            cwd,
                            all: allWorkspaces,
                            workspace: workspaces,
                          },
                        },
                        event: {pkgManager, installManifests, workspaceInfo},
                      }): EventData<typeof SmokerEvent.PkgManagerPackOk> => ({
                        type: SmokerEvent.PkgManagerPackOk,
                        pkgManager,
                        packOptions: {
                          allWorkspaces,
                          cwd,
                          // includeWorkspaceRoot,
                          workspaces,
                        },
                        manifests: installManifests,
                        totalPkgManagers: pkgManagers.length,
                        workspaceInfo,
                      }),
                    },
                  ],
                },
                PKG_MANAGER_PACK_FAILED: {
                  actions: [
                    assign({
                      pkgManagerDidPackCount: ({
                        context: {pkgManagerDidPackCount},
                      }) => {
                        return pkgManagerDidPackCount + 1;
                      },
                    }),
                    {
                      type: 'report',
                      params: ({
                        context: {
                          pkgManagers = [],
                          smokerOptions: {
                            cwd,
                            all: allWorkspaces,
                            workspace: workspaces,
                          },
                        },
                        event: {pkgManager, error, workspaceInfo},
                      }): EventData<
                        typeof SmokerEvent.PkgManagerPackFailed
                      > => ({
                        type: SmokerEvent.PkgManagerPackFailed,
                        pkgManager,
                        packOptions: {
                          cwd,
                          allWorkspaces,
                          // includeWorkspaceRoot,
                          workspaces,
                        },
                        error,
                        totalPkgManagers: pkgManagers.length,
                        workspaceInfo,
                      }),
                    },
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                },
              },
              exit: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      smokerOptions: {
                        cwd,
                        all: allWorkspaces,
                        workspace: workspaces,
                      },
                      uniquePkgNames: uniquePkgs = [],
                      pkgManagers = [],
                      workspaceInfo,
                      error,
                    },
                  }):
                    | EventData<typeof SmokerEvent.PackFailed>
                    | EventData<typeof SmokerEvent.PackOk> => {
                    const totalPkgs = pkgManagers.length * workspaceInfo.length;
                    return error
                      ? {
                          error: error as PackError | PackParseError,
                          type: SmokerEvent.PackFailed,
                          packOptions: {
                            cwd,
                            allWorkspaces,
                            // includeWorkspaceRoot,
                            workspaces,
                          },
                          pkgManagers,
                          uniquePkgs,
                          workspaceInfo,
                          totalPkgs,
                        }
                      : {
                          type: SmokerEvent.PackOk,
                          packOptions: {
                            cwd,
                            allWorkspaces,
                            // includeWorkspaceRoot,
                            workspaces,
                          },
                          pkgManagers,
                          workspaceInfo,
                          uniquePkgs,
                          totalPkgs,
                        };
                  },
                },
              ],
            },
            done: {
              type: MachineUtil.FINAL,
            },
            errored: {
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
                PKG_INSTALL_OK: {
                  target: 'working',
                },
              },
            },
            working: {
              entry: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      smokerOptions: {rules: config},
                      pkgManagers = [],
                      uniquePkgNames = [],
                      rules = [],
                    },
                  }): EventData<typeof SmokerEvent.LintBegin> => ({
                    type: SmokerEvent.LintBegin,
                    totalRules: rules.length,
                    totalPkgManagers: pkgManagers.length,
                    config,
                    totalUniquePkgs: uniquePkgNames.length,
                  }),
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
                {
                  guard: 'isLintingComplete',
                  target: 'done',
                },
              ],
              exit: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      pkgManagers = [],
                      uniquePkgNames = [],
                      rules = [],
                      lintResults = [],
                      smokerOptions: {rules: config},
                    },
                    event,
                  }):
                    | EventData<typeof SmokerEvent.LintOk>
                    | EventData<typeof SmokerEvent.LintFailed> => {
                    const totalRules = rules.length;
                    const totalPkgManagers = pkgManagers.length;
                    const totalUniquePkgs = uniquePkgNames.length;

                    if (
                      lintResults.some((result) => result.type === 'FAILED')
                    ) {
                      return {
                        ...event,
                        results: lintResults,
                        config,
                        totalRules,
                        totalPkgManagers,
                        totalUniquePkgs,
                        type: SmokerEvent.LintFailed,
                      };
                    }
                    return {
                      ...event,
                      results: lintResults as LintResultOk[],
                      config,
                      totalRules: rules.length,
                      totalPkgManagers: pkgManagers.length,
                      totalUniquePkgs: uniquePkgNames.length,
                      type: SmokerEvent.LintOk,
                    };
                  },
                },
              ],
              on: {
                RULE_BEGIN: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {rules},
                        event,
                      }): EventData<typeof SmokerEvent.RuleBegin> => {
                        return {
                          ...event,
                          totalRules: rules.length,
                          type: SmokerEvent.RuleBegin,
                        };
                      },
                    },
                  ],
                },
                RULE_OK: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {rules},
                        event,
                      }): EventData<typeof SmokerEvent.RuleOk> => {
                        return {
                          ...event,
                          totalRules: rules.length,
                          type: SmokerEvent.RuleOk,
                        };
                      },
                    },
                  ],
                },
                RULE_ERROR: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {rules},
                        event,
                      }): EventData<typeof SmokerEvent.RuleError> => {
                        return {
                          ...event,
                          totalRules: rules.length,
                          type: SmokerEvent.RuleError,
                        };
                      },
                    },
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                },
                RULE_FAILED: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {rules},
                        event,
                      }): EventData<typeof SmokerEvent.RuleFailed> => {
                        return {
                          ...event,
                          totalRules: rules.length,
                          type: SmokerEvent.RuleFailed,
                        };
                      },
                    },
                  ],
                },
                PKG_MANAGER_LINT_BEGIN: {
                  actions: [
                    {
                      type: 'report',
                      params: ({
                        context: {pkgManagers = [], rules = []},
                        event: {pkgManager},
                      }): EventData<typeof SmokerEvent.PkgManagerLintBegin> => {
                        return {
                          type: SmokerEvent.PkgManagerLintBegin,
                          pkgManager,
                          totalRules: rules.length,
                          totalPkgManagers: pkgManagers.length,
                        };
                      },
                    },
                  ],
                },
                PKG_MANAGER_LINT_FAILED: {
                  actions: [
                    assign({
                      pkgManagerDidLintCount: ({
                        context: {pkgManagerDidLintCount},
                      }) => pkgManagerDidLintCount + 1,
                    }),
                    {
                      type: 'appendLintResults',
                      params: ({event: {results}}) => results,
                    },
                    {
                      type: 'report',
                      params: ({
                        context: {pkgManagers = [], rules = []},
                        event: {pkgManager, results},
                      }): EventData<
                        typeof SmokerEvent.PkgManagerLintFailed
                      > => {
                        return {
                          type: SmokerEvent.PkgManagerLintFailed,
                          pkgManager,
                          results,
                          totalRules: rules.length,
                          totalPkgManagers: pkgManagers.length,
                        };
                      },
                    },
                  ],
                },
                PKG_MANAGER_LINT_OK: {
                  actions: [
                    assign({
                      pkgManagerDidLintCount: ({
                        context: {pkgManagerDidLintCount},
                      }) => pkgManagerDidLintCount + 1,
                    }),
                    {
                      type: 'appendLintResults',
                      params: ({event: {results}}) => results,
                    },
                    {
                      type: 'report',
                      params: ({
                        context: {pkgManagers = [], rules = []},
                        event: {pkgManager, results},
                      }): EventData<typeof SmokerEvent.PkgManagerLintOk> => {
                        return {
                          type: SmokerEvent.PkgManagerLintOk,
                          pkgManager,
                          results,
                          totalRules: rules.length,
                          totalPkgManagers: pkgManagers.length,
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
                PKG_INSTALL_OK: {
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
          guard: and(['shouldHalt', 'hasNoPkgManagerMachineRefs']),
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
