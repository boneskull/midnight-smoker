import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {fromUnknownError} from '#error';
import {SmokerEvent} from '#event';
import {type SmokerOptions} from '#options/options';
import {type PkgManager} from '#pkg-manager';
import {type PluginRegistry} from '#plugin';
import {type Reporter} from '#reporter/reporter';
import {
  type Executor,
  type LintManifest,
  type LintResult,
  type PackOptions,
  type RunScriptManifest,
  type RunScriptResult,
  type SomeRule,
} from '#schema';
import {FileManager, type FileManagerOpts} from '#util/filemanager';
import {isEmpty, map, partition, sumBy} from 'lodash';
import {type SetRequired} from 'type-fest';
import {
  and,
  assign,
  enqueueActions,
  fromPromise,
  log,
  not,
  sendTo,
  setup,
  type ActorRefFrom,
} from 'xstate';
import {PkgManagerControllerEventHelper} from '../../controller/pkg-manager-controller-event-helper';
import {
  InstallerMachine,
  type InstallerMachineInput,
} from '../installer/installer-machine';
import {type InstallerMachineInstallEvent} from '../installer/installer-machine-events';
import * as MachineUtil from '../machine-util';
import {uniquePkgNames} from '../machine-util';
import {PackerMachine, type PackerMachineInput} from '../packer/packer-machine';
import {
  PluginLoaderMachine,
  type PluginLoaderOutput,
} from '../plugin-loader-machine';
import {
  ReporterMachine,
  type ReporterMachineOutput,
} from '../reporter/reporter-machine';
import {
  RunnerMachine,
  type RunnerMachineOutput,
} from '../runner/runner-machine';
import type * as Event from './control-machine-events';

export interface CtrlInput {
  cwd?: string;

  defaultExecutorId?: string;

  desiredPkgManagers: string[];

  fileManagerOpts?: FileManagerOpts;

  linger?: boolean;

  packOptions?: PackOptions;

  pluginRegistry: PluginRegistry;

  smokerOptions: SmokerOptions;

  systemExecutorId?: string;
}

export type CtrlContext = Omit<
  SetRequired<CtrlInput, 'cwd' | 'linger'>,
  'defaultExecutorId' | 'systemExecutorId' | 'fileManagerOpts'
> & {
  pkgManagers: PkgManager[];
  defaultExecutor: Executor;
  systemExecutor: Executor;
  fm: FileManager;
  // pkgManagerMachines: Record<string, ActorRefFrom<typeof PkgManagerMachine>>;
  pluginLoaderMachineRefs: Record<
    string,
    ActorRefFrom<typeof PluginLoaderMachine>
  >;
  reporterMachineRefs: Record<string, ActorRefFrom<typeof ReporterMachine>>;
  runnerMachineRefs: Record<string, ActorRefFrom<typeof RunnerMachine>>;
  runScriptManifests: WeakMap<PkgManager, RunScriptManifest[]>;
  lintManifests: WeakMap<PkgManager, LintManifest[]>;
  reporters: Reporter[];
  rules: SomeRule[];
  shouldLint: boolean;
  scripts: string[];
  error?: Error;
  runScriptResults?: RunScriptResult[];
  lintResults?: LintResult[];
  totalChecks: number;

  packerMachineRef?: ActorRefFrom<typeof PackerMachine>;
  installerMachineRef?: ActorRefFrom<typeof InstallerMachine>;
};

export type CtrlOutputOk = MachineUtil.MachineOutputOk;

export type CtrlOutputError = MachineUtil.MachineOutputError;

export type CtrlOutput = CtrlOutputOk | CtrlOutputError;

export const ControlMachine = setup({
  types: {
    context: {} as CtrlContext,
    emitted: {} as Event.CtrlEmitted,
    events: {} as Event.CtrlEvents,
    input: {} as CtrlInput,
    output: {} as CtrlOutput,
  },
  actors: {
    setupPkgManagers: fromPromise<void, PkgManager[]>(
      async ({input: pkgManagers}): Promise<void> => {
        await Promise.all(pkgManagers.map((pkgManager) => pkgManager.setup()));
      },
    ),
    teardownPkgManagers: fromPromise<void, PkgManager[]>(
      async ({input: pkgManagers}): Promise<void> => {
        await Promise.all(
          pkgManagers.map((pkgManager) => pkgManager.teardown()),
        );
      },
    ),
    ReporterMachine,
    RunnerMachine,
    PluginLoaderMachine,
    PackerMachine,
    InstallerMachine,
  },
  guards: {
    hasRules: ({context: {rules}}) => Boolean(rules.length),
    didLint: ({context: {lintResults}}) => Boolean(lintResults),
    didNotLint: not('didLint'),
    shouldLint: ({context: {shouldLint}}) => shouldLint,
    isPackingComplete: ({context: {packerMachineRef}}) => !packerMachineRef,
    isPackingIncomplete: not('isPackingComplete'),
    isInstallingComplete: ({context: {installerMachineRef}}) =>
      !installerMachineRef,
    isInstallingIncomplete: not('isInstallingComplete'),
    hasRunScriptResults: ({context: {runScriptResults}}) =>
      Boolean(runScriptResults?.length),
    notHasRunScriptResults: not('hasRunScriptResults'),
    hasScripts: ({context: {scripts}}) => Boolean(scripts.length),
    isMachineOutputOk: (_, output: MachineUtil.MachineOutput) =>
      MachineUtil.isMachineOutputOk(output),
    isMachineOutputNotOk: (_, output: MachineUtil.MachineOutput): boolean =>
      MachineUtil.isMachineOutputNotOk(output),

    hasError: ({context: {error}}) => Boolean(error),
    isPreparationComplete: and(['isPackingComplete', 'isInstallingComplete']),
    notHasError: not('hasError'),
    hasNoRunners: ({context: {runnerMachineRefs}}) =>
      isEmpty(runnerMachineRefs),
    // scriptErrored: (_, {output: {type}}: {output: RunMachineOutput}) =>
    //   type === 'ERROR',
    // scriptBailed: (_, {output: {type}}: {output: RunMachineOutput}) =>
    //   type === 'BAILED',
    // scriptCompleted: (_, {output: {type}}: {output: RunMachineOutput}) =>
    //   type === 'RESULT',
    // scriptFailed: (_, {output: {result}}: {output: RunMachineOutputResult}) =>
    //   'error' in result,
    // scriptSkipped: (_, {output: {result}}: {output: RunMachineOutputResult}) =>
    //   result.skipped,
    // scriptOk: (_, {output: {result}}: {output: RunMachineOutputResult}) =>
    //   !result.error && !result.skipped,
  },
  actions: {
    cleanup: enqueueActions(
      ({enqueue, context: {reporterMachineRefs: reporterMachines}}) => {
        Object.values(reporterMachines).forEach((reporterMachine) => {
          enqueue.sendTo(reporterMachine, {type: 'HALT'});
        });
      },
    ),

    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),

    stopPluginLoaders: enqueueActions(
      ({enqueue, context: {pluginLoaderMachineRefs: pluginLoaderMachines}}) => {
        for (const machine of Object.values(pluginLoaderMachines)) {
          enqueue.stopChild(machine);
        }
        enqueue.assign({pluginLoaderMachineRefs: {}});
      },
    ),

    assignRunScriptManifests: assign({
      runScriptManifests: ({context: {pkgManagers, scripts}}) =>
        new WeakMap(
          pkgManagers.map((pkgManager) => [
            pkgManager,
            pkgManager.buildRunScriptManifests(scripts),
          ]),
        ),
    }),

    assignTotalChecks: assign({
      totalChecks: ({context: {pkgManagers, rules}}) => {
        return (
          rules.length *
          sumBy(
            pkgManagers,
            (pkgManager) => pkgManager.pkgInstallManifests.length,
          )
        );
      },
    }),

    assignLintManifests: assign({
      lintManifests: ({context: {pkgManagers}}) => {
        return new WeakMap(
          pkgManagers.map((pkgManager) => [
            pkgManager,
            pkgManager.pkgInstallManifests.map(({installPath, pkgName}) => ({
              installPath,
              pkgName,
            })),
          ]),
        );
      },
    }),

    spawnRunnerMachines: assign({
      runnerMachineRefs: ({
        context: {scripts, pkgManagers, runScriptManifests},
        self,
        spawn,
      }) => {
        const ac = new AbortController();
        return Object.fromEntries(
          pkgManagers.map((pkgManager, index) => {
            const manifests =
              runScriptManifests.get(pkgManager) ??
              pkgManager.buildRunScriptManifests(scripts);
            const id = `RunnerMachine.${MachineUtil.makeId()}`;
            const actorRef = spawn('RunnerMachine', {
              id,
              input: {
                pkgManager,
                signal: ac.signal,
                parentRef: self,
                index: index + 1,
                runScriptManifests: manifests,
              },
            });
            return [id, MachineUtil.monkeypatchActorLogger(actorRef, id)];
          }),
        );
      },
    }),
    stopRunnerMachine: enqueueActions(
      (
        {enqueue, context: {runnerMachineRefs}},
        {output: {id}}: {output: RunnerMachineOutput},
      ) => {
        enqueue.stopChild(id);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = runnerMachineRefs;
        enqueue.assign({
          runnerMachineRefs: rest,
        });
      },
    ),
    assignPkgManagers: assign({
      pkgManagers: ({context}, {pkgManagers}: {pkgManagers?: PkgManager[]}) =>
        pkgManagers ?? context.pkgManagers,
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
    stopPackerMachine: enqueueActions(
      ({enqueue, context: {packerMachineRef}}) => {
        if (packerMachineRef) {
          enqueue.stopChild(packerMachineRef.id);
          enqueue.assign({packerMachineRef: undefined});
        }
      },
    ),
    stopInstallerMachine: enqueueActions(
      ({enqueue, context: {installerMachineRef}}) => {
        if (installerMachineRef) {
          enqueue.stopChild(installerMachineRef.id);
          enqueue.assign({installerMachineRef: undefined});
        }
      },
    ),
    spawnReporterMachines: assign({
      reporterMachineRefs: ({spawn, context: {reporters}, self}) =>
        Object.fromEntries(
          reporters.map((reporter) => {
            const id = `ReporterMachine.${MachineUtil.makeId()}`;
            const actor = spawn('ReporterMachine', {
              id,
              // @ts-expect-error https://github.com/statelyai/xstate/blob/main/packages/core/src/types.ts#L114 -- no TEmitted
              input: {emitter: self, reporter},
            });
            return [id, MachineUtil.monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),
    assignPluginLoaderResults: assign({
      pkgManagers: ({context: {pkgManagers}}, output: PluginLoaderOutput) => {
        MachineUtil.assertMachineOutputOk(output);
        return [...pkgManagers, ...output.pkgManagers];
      },
      reporters: ({context: {reporters}}, output: PluginLoaderOutput) => {
        MachineUtil.assertMachineOutputOk(output);
        return [...reporters, ...output.reporters];
      },
      rules: ({context: {rules}}, output: PluginLoaderOutput) => {
        MachineUtil.assertMachineOutputOk(output);
        return [...rules, ...output.rules];
      },
    }),
    spawnPluginLoaders: assign({
      pluginLoaderMachineRefs: ({
        context: {
          pluginRegistry,
          cwd,
          desiredPkgManagers,
          fm,
          systemExecutor,
          defaultExecutor,
          smokerOptions: smokerOpts,
        },
        spawn,
      }) =>
        Object.fromEntries(
          pluginRegistry.plugins.map((plugin) => {
            const id = `PluginLoader.${MachineUtil.makeId()}`;
            const actor = spawn('PluginLoaderMachine', {
              id,
              input: {
                plugin,
                pluginRegistry,
                fm,
                cwd,
                desiredPkgManagers,
                systemExecutor,
                defaultExecutor,
                smokerOpts,
              },
            });

            return [id, MachineUtil.monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),
    report: enqueueActions(
      ({enqueue, context: {reporterMachineRefs}}, event: Event.CtrlEmitted) => {
        for (const reporterMachineRef of Object.values(reporterMachineRefs)) {
          enqueue.sendTo(reporterMachineRef, {type: 'EVENT', event});
        }
        enqueue.emit(event);
      },
    ),
  },
}).createMachine({
  id: 'PkgManagerControl',
  context: ({
    input: {
      pluginRegistry,
      desiredPkgManagers,
      defaultExecutorId = DEFAULT_EXECUTOR_ID,
      systemExecutorId = SYSTEM_EXECUTOR_ID,
      cwd = process.cwd(),
      fileManagerOpts,
      linger = false,
      smokerOptions,
      packOptions, // TODO: only use smokeroptions
    },
  }): CtrlContext => ({
    desiredPkgManagers,
    pluginRegistry,
    cwd,
    smokerOptions,
    packOptions,
    linger,

    defaultExecutor: pluginRegistry.getExecutor(defaultExecutorId),
    systemExecutor: pluginRegistry.getExecutor(systemExecutorId),
    fm: new FileManager(fileManagerOpts),

    shouldLint: false,
    pkgManagers: [],
    pluginLoaderMachineRefs: {},
    runnerMachineRefs: {},
    reporterMachineRefs: {},
    reporters: [],
    rules: [],
    scripts: [],
    runScriptManifests: new WeakMap(),
    lintManifests: new WeakMap(),
    totalChecks: 0,
  }),
  initial: 'loading',
  on: {
    RUN_SCRIPTS: {
      guard: and([not('hasScripts'), 'notHasRunScriptResults']),
      actions: [
        assign({scripts: ({event: {scripts}}) => scripts}),
        log('will run scripts'),
      ],
    },

    LINT: [
      {
        guard: and(['didNotLint', 'hasRules']),
        actions: [assign({shouldLint: true}), log('will lint')],
      },
      {
        guard: and(['didNotLint', not('hasRules')]),
        actions: [log('no rules to lint')], // TODO better warning
      },
    ],

    HALT: {
      actions: [log('stopping...')],
      target: '.done',
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
              MachineUtil.assertMachineOutputNotOk(output);
              return {
                error: output.error,
              };
            },
          },
        ],
        target: '.errored',
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
            }) => `pkg manager machine ${id} exited gracefully`,
          ),
        ],
      },
      {actions: [{type: 'stopReporterMachine', params: ({event}) => event}]},
    ],
  },
  states: {
    loading: {
      entry: [log('loading plugin components...')],
      initial: 'loadingPlugins',
      states: {
        loadingPlugins: {
          entry: [{type: 'spawnPluginLoaders'}],
          on: {
            'xstate.done.actor.PluginLoader.*': [
              {
                guard: {
                  type: 'isMachineOutputNotOk',
                  params: ({event: {output}}) => output,
                },
                actions: [
                  {
                    type: 'assignError',
                    params: ({event: {output}}) => {
                      MachineUtil.assertMachineOutputNotOk(output);
                      return {error: output.error};
                    },
                  },
                ],
                target: 'errored',
              },
              {
                guard: {
                  type: 'isMachineOutputOk',
                  params: ({event: {output}}) => output,
                },
                actions: [
                  {
                    type: 'assignPluginLoaderResults',
                    params: ({event: {output}}) => output,
                  },
                ],
                target: 'loadedPlugins',
              },
            ],
          },
        },
        errored: {
          entry: [log('errored out!')],
          type: 'final',
        },
        loadedPlugins: {
          invoke: {
            src: 'setupPkgManagers',
            input: ({context: {pkgManagers}}) => pkgManagers,
            onDone: {
              target: 'done',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => ({error}),
                },
              ],
              target: '#PkgManagerControl.errored',
            },
          },
          entry: [
            {
              type: 'spawnReporterMachines',
            },
          ],
        },
        done: {
          type: 'final',
        },
      },
      onDone: {
        target: 'setup',
        actions: [log('done loading components')],
      },
    },
    setup: {
      entry: [
        {
          type: 'report',
          params: ({
            context: {pluginRegistry, smokerOptions},
          }): Event.CtrlExternalEvent<typeof SmokerEvent.SmokeBegin> => ({
            type: SmokerEvent.SmokeBegin,
            plugins: pluginRegistry.plugins.map((plugin) => plugin.toJSON()),
            opts: smokerOptions,
          }),
        },
        // log('performing packing and installation...'),
        assign({
          installerMachineRef: ({self, spawn}) => {
            const input: InstallerMachineInput = {
              parentRef: self,
              signal: new AbortController().signal,
            };
            const id = 'InstallerMachine';
            const actorRef = spawn('InstallerMachine', {
              id,
              input,
            });
            return MachineUtil.monkeypatchActorLogger(actorRef, id);
          },
          packerMachineRef: ({
            self,
            spawn,
            context: {packOptions: opts, pkgManagers},
          }) => {
            const input: PackerMachineInput = {
              opts,
              pkgManagers,
              signal: new AbortController().signal,
              parentRef: self,
            };
            const id = 'PackerMachine';
            const actorRef = spawn('PackerMachine', {
              id,
              input,
            });
            return MachineUtil.monkeypatchActorLogger(actorRef, id);
          },
        }),
      ],
      on: {
        'xstate.done.actor.PackerMachine': [
          {
            guard: {
              type: 'isMachineOutputOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              {
                type: 'report',
                params: ({
                  context,
                  event: {output},
                }): Event.CtrlExternalEvent<typeof SmokerEvent.PackOk> => {
                  MachineUtil.assertMachineOutputOk(output);
                  return {
                    uniquePkgs: uniquePkgNames(output.manifests),
                    type: SmokerEvent.PackOk,
                    pkgManagers: map(context.pkgManagers, 'staticSpec'),
                    manifests: output.manifests,
                    total: output.manifests.length,
                  };
                },
              },
              sendTo(
                ({context: {installerMachineRef}}) => installerMachineRef!,
                {type: 'PACKING_COMPLETE'},
              ),
              {
                type: 'stopPackerMachine',
              },
            ],
          },
          {
            guard: {
              type: 'isMachineOutputNotOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              {
                type: 'report',
                params: ({
                  context: {pkgManagers, packOptions},
                  event: {output},
                }): Event.CtrlExternalEvent<typeof SmokerEvent.PackFailed> => {
                  MachineUtil.assertMachineOutputNotOk(output);
                  return {
                    error: output.error,
                    type: SmokerEvent.PackFailed,
                    packOptions,
                    ...PkgManagerControllerEventHelper.buildPackBeginEventData(
                      pkgManagers,
                    ),
                  };
                },
              },
              {
                type: 'assignError',
                params: ({event: {output}}) => {
                  MachineUtil.assertMachineOutputNotOk(output);
                  return {error: output.error};
                },
              },
              {
                type: 'stopPackerMachine',
              },
            ],
            target: 'errored',
          },
        ],
        'xstate.done.actor.InstallerMachine': [
          {
            guard: {
              type: 'isMachineOutputNotOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              {
                type: 'report',
                params: ({
                  context: {pkgManagers},
                  event: {output},
                }): Event.CtrlExternalEvent<
                  typeof SmokerEvent.InstallFailed
                > => {
                  MachineUtil.assertMachineOutputNotOk(output);
                  return {
                    error: output.error,
                    type: SmokerEvent.InstallFailed,
                    ...PkgManagerControllerEventHelper.buildInstallEventData(
                      pkgManagers,
                    ),
                  };
                },
              },
              {
                type: 'assignError',
                params: ({event: {output}}) => {
                  MachineUtil.assertMachineOutputNotOk(output);
                  return {error: output.error};
                },
              },
              {
                type: 'stopInstallerMachine',
              },
            ],
            target: 'errored',
          },
          {
            guard: {
              type: 'isMachineOutputOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              {
                type: 'report',
                params: ({
                  context: {pkgManagers},
                  event: {output},
                }): Event.CtrlExternalEvent<typeof SmokerEvent.InstallOk> => {
                  MachineUtil.assertMachineOutputOk(output);
                  const {manifests} = output;
                  const [additionalDeps, pkgs] = partition(
                    manifests,
                    'isAdditional',
                  );
                  const uniquePkgs: string[] = uniquePkgNames(pkgs);
                  const uniqueAdditionalDeps = uniquePkgNames(additionalDeps);
                  const pkgManagerSpecs = map(pkgManagers, 'staticSpec');
                  return {
                    type: SmokerEvent.InstallOk,
                    uniquePkgs,
                    pkgManagers: pkgManagerSpecs,
                    manifests,
                    total: manifests.length,
                    additionalDeps: uniqueAdditionalDeps,
                  };
                },
              },
              {
                type: 'stopInstallerMachine',
              },
            ],
          },
        ],
        PACK_BEGIN: {
          actions: [
            log('received PACK_BEGIN'),
            {
              type: 'report',
              params: ({
                context: {packOptions, pkgManagers},
              }): Event.CtrlExternalEvent<typeof SmokerEvent.PackBegin> => ({
                type: SmokerEvent.PackBegin,
                packOptions,
                ...PkgManagerControllerEventHelper.buildPackBeginEventData(
                  pkgManagers,
                ),
              }),
            },
          ],
        },
        INSTALL_BEGIN: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers},
              }): Event.CtrlExternalEvent<typeof SmokerEvent.InstallBegin> => ({
                type: SmokerEvent.InstallBegin,
                ...PkgManagerControllerEventHelper.buildInstallEventData(
                  pkgManagers,
                ),
              }),
            },
          ],
        },
        PKG_MANAGER_PACK_BEGIN: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers, packOptions},
                event: {index, pkgManager},
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerPackBegin
              > => {
                return {
                  type: SmokerEvent.PkgManagerPackBegin,
                  currentPkgManager: index,
                  pkgManager: pkgManager.staticSpec,
                  packOptions,
                  totalPkgManagers: pkgManagers.length,
                };
              },
            },
          ],
        },
        PKG_MANAGER_INSTALL_BEGIN: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers},
                event: {index, pkgManager, installManifests},
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerInstallBegin
              > => ({
                type: SmokerEvent.PkgManagerInstallBegin,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                manifests: installManifests,
                totalPkgManagers: pkgManagers.length,
              }),
            },
          ],
        },
        PKG_MANAGER_PACK_OK: [
          {
            guard: ({context: {installerMachineRef}}) =>
              Boolean(installerMachineRef),
            actions: [
              {
                type: 'report',
                params: ({
                  context: {pkgManagers, packOptions},
                  event: {index, pkgManager, installManifests},
                }): Event.CtrlExternalEvent<
                  typeof SmokerEvent.PkgManagerPackOk
                > => ({
                  type: SmokerEvent.PkgManagerPackOk,
                  currentPkgManager: index,
                  pkgManager: pkgManager.staticSpec,
                  packOptions,
                  manifests: installManifests,
                  totalPkgManagers: pkgManagers.length,
                }),
              },
              sendTo(
                ({context: {installerMachineRef}}) => installerMachineRef!,
                ({
                  event: {pkgManager, installManifests},
                }): InstallerMachineInstallEvent => ({
                  type: 'INSTALL',
                  pkgManager,
                  installManifests,
                }),
              ),
            ],
          },
        ],
        PKG_MANAGER_PACK_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers, packOptions},
                event: {index, pkgManager, error},
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerPackFailed
              > => ({
                type: SmokerEvent.PkgManagerPackFailed,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                packOptions,
                error,
                totalPkgManagers: pkgManagers.length,
              }),
            },
          ],
          target: 'errored',
        },
        PKG_MANAGER_INSTALL_OK: [
          {
            actions: [
              {
                type: 'report',
                params: ({
                  context: {pkgManagers},
                  event: {index, pkgManager, installManifests},
                }): Event.CtrlExternalEvent<
                  typeof SmokerEvent.PkgManagerInstallOk
                > => ({
                  type: SmokerEvent.PkgManagerInstallOk,
                  manifests: installManifests,
                  currentPkgManager: index,
                  pkgManager: pkgManager.staticSpec,
                  totalPkgManagers: pkgManagers.length,
                }),
              },
            ],
          },
        ],
        PKG_MANAGER_INSTALL_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers},
                event: {index, pkgManager, installManifests, error},
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerInstallFailed
              > => ({
                type: SmokerEvent.PkgManagerInstallFailed,
                manifests: installManifests,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                error,
                totalPkgManagers: pkgManagers.length,
              }),
            },
          ],
          target: 'errored',
        },
      },
      always: [
        {
          target: 'ready',
          guard: {type: 'isPreparationComplete'},
          actions: [log('all pkg manager machines in ready state')],
        },
      ],
    },
    ready: {
      entry: [log('ready for events')],
      always: [
        {
          guard: and(['hasScripts', 'notHasRunScriptResults']),
          target: 'runningScripts',
        },
        {
          guard: {type: 'shouldLint'},
          target: 'linting',
        },
      ],
    },
    runningScripts: {
      initial: 'running',
      states: {
        running: {
          entry: [
            log('running scripts...'),
            {
              type: 'spawnRunnerMachines',
            },
            {
              type: 'report',
              params: ({
                context: {pkgManagers, scripts, runScriptManifests},
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.RunScriptsBegin
              > => {
                let pkgNames = new Set<string>();
                const manifests: Record<string, RunScriptManifest[]> =
                  Object.fromEntries(
                    pkgManagers.map((pkgManager) => {
                      const manifests =
                        runScriptManifests.get(pkgManager) ??
                        pkgManager.buildRunScriptManifests(scripts);
                      pkgNames = new Set([
                        ...pkgNames,
                        ...map(manifests, 'pkgName'),
                      ]);
                      return [`${pkgManager.spec}`, manifests];
                    }),
                  );

                return {
                  type: SmokerEvent.RunScriptsBegin,
                  manifests,
                  totalUniqueScripts: scripts.length,
                  totalUniquePkgs: pkgNames.size,
                  totalPkgManagers: pkgManagers.length,
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
                    event: {
                      runScriptManifest,
                      pkgManager,
                      scriptIndex,
                      pkgManagerIndex,
                    },
                  }): Event.CtrlExternalEvent<
                    typeof SmokerEvent.RunScriptBegin
                  > => ({
                    type: SmokerEvent.RunScriptBegin,
                    totalUniqueScripts: context.scripts.length,
                    currentScript: scriptIndex * pkgManagerIndex,
                    pkgManager: pkgManager.staticSpec,
                    ...runScriptManifest,
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
                    event: {
                      runScriptManifest,
                      pkgManager,
                      scriptIndex,
                      pkgManagerIndex,
                      result,
                    },
                  }): Event.CtrlExternalEvent<
                    typeof SmokerEvent.RunScriptFailed
                  > => ({
                    type: SmokerEvent.RunScriptFailed,
                    totalUniqueScripts: context.scripts.length,
                    currentScript: scriptIndex * pkgManagerIndex,
                    pkgManager: pkgManager.staticSpec,
                    ...runScriptManifest,
                    error: result.error!,
                  }),
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
                    event: {
                      runScriptManifest,
                      pkgManager,
                      scriptIndex,
                      pkgManagerIndex,
                    },
                  }): Event.CtrlExternalEvent<
                    typeof SmokerEvent.RunScriptSkipped
                  > => ({
                    type: SmokerEvent.RunScriptSkipped,
                    totalUniqueScripts: context.scripts.length,
                    currentScript: scriptIndex * pkgManagerIndex,
                    pkgManager: pkgManager.staticSpec,
                    skipped: true,
                    ...runScriptManifest,
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
                      event: {
                        runScriptManifest,
                        pkgManager,
                        scriptIndex,
                        pkgManagerIndex,
                        result,
                      },
                    }): Event.CtrlExternalEvent<
                      typeof SmokerEvent.RunScriptOk
                    > => ({
                      type: SmokerEvent.RunScriptOk,
                      totalUniqueScripts: context.scripts.length,
                      currentScript: scriptIndex * pkgManagerIndex,
                      pkgManager: pkgManager.staticSpec,
                      ...runScriptManifest,
                      rawResult: result.rawResult!,
                    }),
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
            PKG_MANAGER_RUN_SCRIPTS_BEGIN: {
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {pkgManagers, scripts},
                    event: {pkgManager, manifests, currentPkgManager},
                  }): Event.CtrlExternalEvent<
                    typeof SmokerEvent.PkgManagerRunScriptsBegin
                  > => {
                    return {
                      type: SmokerEvent.PkgManagerRunScriptsBegin,
                      pkgManager,
                      manifests,
                      currentPkgManager,
                      totalPkgManagers: pkgManagers.length,
                      totalUniqueScripts: scripts.length,
                      totalUniquePkgs: uniquePkgNames(manifests).length,
                    };
                  },
                },
              ],
            },
            'xstate.done.actor.RunnerMachine.*': {
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {pkgManagers, scripts},
                    event: {
                      output: {pkgManager, manifests, pkgManagerIndex, results},
                    },
                  }): Event.CtrlExternalEvent<
                    | typeof SmokerEvent.PkgManagerRunScriptsOk
                    | typeof SmokerEvent.PkgManagerRunScriptsFailed
                  > => {
                    const type = results.some((result) => result.error)
                      ? SmokerEvent.PkgManagerRunScriptsFailed
                      : SmokerEvent.PkgManagerRunScriptsOk;

                    return {
                      type,
                      pkgManager: pkgManager.staticSpec,
                      results,
                      manifests,
                      currentPkgManager: pkgManagerIndex,
                      totalPkgManagers: pkgManagers.length,
                      totalUniqueScripts: scripts.length,
                      totalUniquePkgs: uniquePkgNames(manifests).length,
                    };
                  },
                },
                {
                  type: 'stopRunnerMachine',
                  params: ({event}) => event,
                },
              ],
            },
          },
          always: [
            {
              guard: 'hasNoRunners',
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      runScriptResults,
                      pkgManagers,
                      runScriptManifests,
                      scripts,
                    },
                  }): Event.CtrlExternalEvent<
                    | typeof SmokerEvent.RunScriptsOk
                    | typeof SmokerEvent.RunScriptsFailed
                  > => {
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

                    let pkgNames = new Set<string>();
                    const manifests: Record<string, RunScriptManifest[]> =
                      Object.fromEntries(
                        pkgManagers.map((pkgManager) => {
                          const manifests =
                            runScriptManifests.get(pkgManager) ??
                            pkgManager.buildRunScriptManifests(scripts);
                          pkgNames = new Set([
                            ...pkgNames,
                            ...map(manifests, 'pkgName'),
                          ]);
                          return [`${pkgManager.spec}`, manifests];
                        }),
                      );

                    return {
                      type,
                      passed,
                      skipped,
                      failed,
                      manifests,
                      totalUniqueScripts: scripts.length,
                      totalUniquePkgs: pkgNames.size,
                      totalPkgManagers: pkgManagers.length,
                      results: runScriptResults!,
                    };
                  },
                },
              ],
              target: 'done',
            },
          ],
        },
        done: {
          type: 'final',
        },
      },
      onDone: {
        target: 'ready',
      },
    },
    linting: {
      entry: [
        {
          type: 'assignLintManifests',
        },
        {
          type: 'assignTotalChecks',
        },
        log('linting...'),
        {
          type: 'report',
          params: ({
            context: {
              rules: {length: totalRules},
              smokerOptions: {rules: config},
              pkgManagers: {length: totalPkgManagers},
              totalChecks,
            },
          }): Event.CtrlExternalEvent<typeof SmokerEvent.LintBegin> => ({
            type: SmokerEvent.LintBegin,
            config,
            totalPkgManagers,
            totalRules,
            totalUniquePkgs: totalChecks / totalRules,
          }),
        },
      ],
      on: {
        RULE_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  rules: {length: totalRules},
                },
                event,
              }): Event.CtrlExternalEvent<typeof SmokerEvent.RuleFailed> => {
                return {
                  ...event,
                  totalRules,
                  type: SmokerEvent.RuleFailed,
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
                context: {
                  rules: {length: totalRules},
                },
                event,
              }): Event.CtrlExternalEvent<typeof SmokerEvent.RuleOk> => {
                return {
                  ...event,
                  totalRules,
                  type: SmokerEvent.RuleOk,
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
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  rules: {length: totalRules},
                  totalChecks,
                },
                event,
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerLintBegin
              > => ({
                ...event,
                type: SmokerEvent.PkgManagerLintBegin,
                totalPkgManagers,
                totalRules,
                totalPkgManagerChecks:
                  totalRules > 0 ? totalChecks / totalRules : 0,
              }),
            },
          ],
        },
        PKG_MANAGER_LINT_OK: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  rules: {length: totalRules},
                  totalChecks,
                },
                event,
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerLintOk
              > => ({
                ...event,
                type: SmokerEvent.PkgManagerLintOk,
                totalPkgManagers,
                totalRules,
                totalPkgManagerChecks:
                  totalRules > 0 ? totalChecks / totalRules : 0,
              }),
            },
          ],
        },
        PKG_MANAGER_LINT_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers: {length: totalPkgManagers},
                  rules: {length: totalRules},
                  totalChecks,
                },
                event,
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerLintFailed
              > => ({
                ...event,
                type: SmokerEvent.PkgManagerLintFailed,
                totalPkgManagers,
                totalRules,
                totalPkgManagerChecks:
                  totalRules > 0 ? totalChecks / totalRules : 0,
              }),
            },
          ],
        },
        LINT_FAILED: {},
        LINT_OK: {
          actions: [
            log('done linting'),

            // TODO: emit
          ],
          target: 'ready',
        },
      },
    },
    done: {
      entry: [
        {
          type: 'report',
          params: {type: SmokerEvent.BeforeExit},
        },
        {type: 'cleanup'},
      ],
      always: [
        {
          guard: {type: 'notHasError'},
          target: 'complete',
        },
        {guard: {type: 'hasError'}, target: 'errored'},
      ],
    },
    errored: {
      entry: [log('error!')],
      type: 'final',
    },
    complete: {
      entry: [log('complete')],
      type: 'final',
    },
  },
  output: ({self: {id}, context: {error}}): CtrlOutput =>
    error ? {type: 'ERROR', error, id} : {type: 'OK', id},
});
