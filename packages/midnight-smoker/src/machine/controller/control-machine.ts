import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {PkgManagerControllerEventHelper} from '#controller/pkg-manager-controller-event-helper';
import {
  fromUnknownError,
  type InstallError,
  type PackError,
  type PackParseError,
} from '#error';
import {SmokerEvent} from '#event';
import {type SmokerOptions} from '#options/options';
import {type PkgManager} from '#pkg-manager';
import {type PluginRegistry} from '#plugin';
import {type Reporter} from '#reporter/reporter';
import {
  type Executor,
  type InstallManifest,
  type LintResult,
  type PackOptions,
  type RunScriptManifest,
  type RunScriptResult,
  type SomeRule,
  type StaticPkgManagerSpec,
} from '#schema';
import {FileManager, type FileManagerOpts} from '#util/filemanager';
import {ok} from 'assert';
import {partition} from 'lodash';
import {type SetRequired} from 'type-fest';
import {
  and,
  assertEvent,
  assign,
  emit,
  enqueueActions,
  log,
  not,
  setup,
  type ActorRefFrom,
} from 'xstate';
import * as MachineUtil from '../machine-util';
import {
  PkgManagerMachine,
  type PMMOutput,
} from '../pkg-manager/pkg-manager-machine';
import {
  PluginLoaderMachine,
  type PluginLoaderOutput,
} from '../plugin-loader-machine';
import {ReporterMachine, type RMOutput} from '../reporter-machine';
import {type SRMOutput, type SRMOutputResult} from '../script-runner-machine';
import type * as Event from './control-machine-events';

interface LintManifest {
  pkgName: string;
  installPath: string;
}

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
  pkgManagerMachines: Record<string, ActorRefFrom<typeof PkgManagerMachine>>;

  pluginLoaderMachines: Record<
    string,
    ActorRefFrom<typeof PluginLoaderMachine>
  >;
  reporterMachines: Record<string, ActorRefFrom<typeof ReporterMachine>>;
  reporters: Reporter[];
  rules: SomeRule[];
  shouldLint: boolean;
  // installManifests?: InstallManifest[];
  scripts?: string[];
  error?: Error;
  currentScript?: number;
  totalScripts?: number;
  runScriptResults?: RunScriptResult[];
  runScriptManifestsByPkgManager?: Record<string, RunScriptManifest[]>;
  packIncomplete?: Set<string>;
  installIncomplete?: Set<string>;
  lintResults?: LintResult[];
  lintManifests?: LintManifest[];
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
    reporter: ReporterMachine,
    pkgManager: PkgManagerMachine,
    pluginLoader: PluginLoaderMachine,
  },
  guards: {
    didLint: ({context: {lintResults}}) => !lintResults,
    didNotLint: not('didLint'),
    shouldLint: ({context: {shouldLint}}) => shouldLint,
    isPackingComplete: ({context: {packIncomplete}}) =>
      Boolean(packIncomplete && packIncomplete.size === 0),
    isPackingIncomplete: not('isPackingComplete'),
    isInstallingComplete: ({context: {installIncomplete}}) =>
      Boolean(installIncomplete && installIncomplete.size === 0),
    isInstallingIncomplete: not('isInstallingComplete'),
    hasRunScriptResults: ({context: {runScriptResults}}) =>
      Boolean(runScriptResults?.length),
    notHasRunScriptResults: not('hasRunScriptResults'),
    hasScripts: ({context: {scripts}}) => Boolean(scripts?.length),
    isMachineOutputOk: (_, output: MachineUtil.MachineOutput) =>
      MachineUtil.isMachineOutputOk(output),
    isMachineOutputNotOk: (_, output: MachineUtil.MachineOutput): boolean =>
      MachineUtil.isMachineOutputNotOk(output),

    hasError: ({context: {error}}) => Boolean(error),
    isPreparationComplete: and(['isPackingComplete', 'isInstallingComplete']),
    notHasError: not('hasError'),
    scriptErrored: (_, {output: {type}}: {output: SRMOutput}) =>
      type === 'ERROR',
    scriptBailed: (_, {output: {type}}: {output: SRMOutput}) =>
      type === 'BAILED',
    scriptCompleted: (_, {output: {type}}: {output: SRMOutput}) =>
      type === 'RESULT',
    scriptFailed: (_, {output: {result}}: {output: SRMOutputResult}) =>
      'error' in result,
    scriptSkipped: (_, {output: {result}}: {output: SRMOutputResult}) =>
      result.skipped,
    scriptOk: (_, {output: {result}}: {output: SRMOutputResult}) =>
      !result.error && !result.skipped,
  },
  actions: {
    // assignInstallManifests: assign({
    //   installManifests: (
    //     {context: {installManifests = []}},
    //     newInstallManifests: InstallManifest[],
    //   ) => [...installManifests, ...newInstallManifests],
    // }),
    cleanup: enqueueActions(
      ({enqueue, context: {pkgManagerMachines, reporterMachines}}) => {
        Object.values(pkgManagerMachines).forEach((pkgManagerMachine) => {
          enqueue.sendTo(pkgManagerMachine, {type: 'HALT'});
        });
        Object.values(reporterMachines).forEach((reporterMachine) => {
          enqueue.sendTo(reporterMachine, {type: 'HALT'});
        });
      },
    ),
    markPackComplete: enqueueActions(
      ({
        enqueue,
        context: {pkgManagers, packIncomplete, packOptions},
        event,
      }) => {
        assertEvent(event, ['PKG_MANAGER_PACK_OK', 'PKG_MANAGER_PACK_FAILED']);
        const newPackIncomplete = new Set(packIncomplete);
        newPackIncomplete.delete(event.sender);
        enqueue.assign({
          packIncomplete: newPackIncomplete,
        });
        if (!newPackIncomplete.size) {
          // enqueue.raise(event);
          enqueue.emit(<Event.CtrlExternalEvent<'PackOk'>>{
            packOptions,
            type: SmokerEvent.PackOk,
            ...PkgManagerControllerEventHelper.buildInstallEventData(
              pkgManagers,
            ),
          });
          // enqueue.raise({type: 'PACK_COMPLETE'});
        }
      },
    ),
    markInstallComplete: enqueueActions(
      ({enqueue, context: {pkgManagers, installIncomplete}, event}) => {
        assertEvent(event, [
          'PKG_MANAGER_INSTALL_OK',
          'PKG_MANAGER_INSTALL_FAILED',
        ]);
        const newInstallIncomplete = new Set(installIncomplete);
        newInstallIncomplete.delete(event.sender);
        enqueue.assign({
          installIncomplete: newInstallIncomplete,
        });
        if (!newInstallIncomplete.size) {
          enqueue.emit(<Event.CtrlExternalEvent<'InstallOk'>>{
            type: SmokerEvent.InstallOk,
            ...PkgManagerControllerEventHelper.buildInstallEventData(
              pkgManagers,
            ),
          });
        }
      },
    ),
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),
    emitBeforeExit: emit({type: SmokerEvent.BeforeExit}),
    emitPackOk: emit(
      ({context: {pkgManagers}}): Event.CtrlExternalEvent<'PackOk'> => ({
        type: SmokerEvent.PackOk,
        ...PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers),
      }),
    ),
    emitPackBegin: emit(
      ({
        context: {pkgManagers, packOptions},
      }): Event.CtrlExternalEvent<'PackBegin'> => ({
        type: SmokerEvent.PackBegin,
        packOptions,
        ...PkgManagerControllerEventHelper.buildPackBeginEventData(pkgManagers),
      }),
    ),
    emitPackFailed: emit(
      (
        {context: {pkgManagers, packOptions}},
        {error}: {error: PackError | PackParseError},
      ): Event.CtrlExternalEvent<'PackFailed'> => ({
        error,
        type: SmokerEvent.PackFailed,
        packOptions,
        ...PkgManagerControllerEventHelper.buildPackBeginEventData(pkgManagers),
      }),
    ),
    emitInstallOk: emit(
      ({context: {pkgManagers}}): Event.CtrlExternalEvent<'InstallOk'> => ({
        type: SmokerEvent.InstallOk,
        ...PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers),
      }),
    ),
    emitInstallFailed: emit(
      (
        {context: {pkgManagers}},
        {error}: {error: InstallError},
      ): Event.CtrlExternalEvent<'InstallFailed'> => ({
        error,
        type: SmokerEvent.InstallFailed,
        ...PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers),
      }),
    ),
    emitPkgManagerPackBegin: emit(
      (
        {context: {pkgManagers, packOptions}},
        {index, pkgManager}: {index: number; pkgManager: StaticPkgManagerSpec},
      ): Event.CtrlExternalEvent<'PkgManagerPackBegin'> => ({
        type: SmokerEvent.PkgManagerPackBegin,
        current: index,
        pkgManager,
        packOptions,
        total: pkgManagers.length,
      }),
    ),
    emitPkgManagerPackOk: emit(
      (
        {context: {pkgManagers, packOptions}},
        {
          index,
          pkgManager,
          installManifests,
        }: {
          index: number;
          pkgManager: StaticPkgManagerSpec;
          installManifests: InstallManifest[];
        },
      ): Event.CtrlExternalEvent<'PkgManagerPackOk'> => ({
        type: SmokerEvent.PkgManagerPackOk,
        current: index,
        pkgManager,
        packOptions,
        manifests: installManifests,
        total: pkgManagers.length,
      }),
    ),
    emitPkgManagerInstallBegin: emit(
      (
        {context: {pkgManagers}},
        {index, pkgManager}: {index: number; pkgManager: StaticPkgManagerSpec},
      ): Event.CtrlExternalEvent<'PkgManagerInstallBegin'> => ({
        type: SmokerEvent.PkgManagerInstallBegin,
        current: index,
        pkgManager,
        total: pkgManagers.length,
      }),
    ),
    emitPkgManagerInstallOk: emit(
      (
        {context: {pkgManagers}},
        {index, pkgManager}: {index: number; pkgManager: StaticPkgManagerSpec},
      ): Event.CtrlExternalEvent<'PkgManagerInstallOk'> => ({
        type: SmokerEvent.PkgManagerInstallOk,
        current: index,
        pkgManager,
        total: pkgManagers.length,
      }),
    ),
    emitPkgManagerInstallFailed: emit(
      (
        {context: {pkgManagers}},
        {
          index,
          pkgManager,
          error,
        }: {
          index: number;
          pkgManager: StaticPkgManagerSpec;
          error: InstallError;
        },
      ): Event.CtrlExternalEvent<'PkgManagerInstallFailed'> => ({
        type: SmokerEvent.PkgManagerInstallFailed,
        current: index,
        pkgManager,
        error,
        total: pkgManagers.length,
      }),
    ),
    emitPkgManagerPackFailed: emit(
      (
        {context: {pkgManagers, packOptions}},
        {
          index,
          pkgManager,
          error,
        }: {
          index: number;
          pkgManager: StaticPkgManagerSpec;
          error: PackError | PackParseError;
        },
      ): Event.CtrlExternalEvent<'PkgManagerPackFailed'> => {
        return {
          type: SmokerEvent.PkgManagerPackFailed,
          current: index,
          pkgManager,
          packOptions,
          error,
          total: pkgManagers.length,
        };
      },
    ),

    stopPkgManagerMachines: enqueueActions(
      ({enqueue, context: {pkgManagerMachines}}) => {
        for (const machine of Object.values(pkgManagerMachines)) {
          enqueue.stopChild(machine);
        }
        enqueue.assign({pkgManagerMachines: {}});
      },
    ),
    stopReporterMachines: enqueueActions(
      ({enqueue, context: {reporterMachines}}) => {
        for (const machine of Object.values(reporterMachines)) {
          enqueue.stopChild(machine);
        }
        enqueue.assign({reporterMachines: {}});
      },
    ),
    stopPluginLoaders: enqueueActions(
      ({enqueue, context: {pluginLoaderMachines}}) => {
        for (const machine of Object.values(pluginLoaderMachines)) {
          enqueue.stopChild(machine);
        }
        enqueue.assign({pluginLoaderMachines: {}});
      },
    ),
    scriptsBegin: enqueueActions(
      (
        {enqueue, context: {pkgManagerMachines, pkgManagers}},
        {scripts}: {scripts: string[]},
      ) => {
        let total = 0;

        const manifestsBySpec = Object.fromEntries(
          pkgManagers.map((pkgManager) => {
            const runScriptManifests =
              pkgManager.buildRunScriptManifests(scripts);
            total += runScriptManifests.length;
            return [`${pkgManager.spec}`, runScriptManifests];
          }),
        );

        enqueue.assign({
          runScriptManifestsByPkgManager: manifestsBySpec,
          totalScripts: total,
        });

        for (const machine of Object.values(pkgManagerMachines)) {
          enqueue.sendTo(machine, {type: 'RUN_SCRIPTS', scripts});
        }
      },
    ),
    emitScriptsBegin: emit(
      ({
        context: {
          runScriptManifestsByPkgManager: manifest,
          totalScripts: total,
        },
      }): Event.CtrlExternalEvent<'RunScriptsBegin'> => {
        ok(manifest, 'No runScriptManifestsByPkgManager. This is a bug');
        ok(total, 'No total scripts count. This is a bug');
        return {
          type: SmokerEvent.RunScriptsBegin,
          manifest,
          total,
        };
      },
    ),
    emitScriptBegin: emit(
      (
        {context: {totalScripts}},
        {
          runScriptManifest,
          scriptIndex,
          pkgManagerIndex,
        }: Event.CtrlWillRunScriptEvent,
      ): Event.CtrlExternalEvent<'RunScriptBegin'> => ({
        type: SmokerEvent.RunScriptBegin,
        current: scriptIndex * pkgManagerIndex,
        total: totalScripts,
        ...runScriptManifest,
      }),
    ),
    emitScriptFailed: emit(
      (
        {context: {totalScripts}},
        {output: {result, manifest}}: {output: SRMOutputResult},
      ): Event.CtrlExternalEvent<'RunScriptFailed'> => ({
        type: SmokerEvent.RunScriptFailed,
        ...manifest,
        total: totalScripts!,
        current: 0,
        error: result.error!,
      }),
    ),
    emitScriptSkipped: emit(
      (
        {context: {totalScripts}},
        {output: {manifest}}: {output: SRMOutputResult},
      ): Event.CtrlExternalEvent<'RunScriptSkipped'> => ({
        type: SmokerEvent.RunScriptSkipped,
        ...manifest,
        total: totalScripts!,
        current: 0,
        skipped: true,
      }),
    ),
    emitScriptOk: emit(
      (
        {context: {totalScripts}},
        {output: {result, manifest}}: {output: SRMOutputResult},
      ): Event.CtrlExternalEvent<'RunScriptOk'> => ({
        type: SmokerEvent.RunScriptOk,
        ...manifest,
        total: totalScripts!,
        current: 0,
        rawResult: result.rawResult!,
      }),
    ),
    emitScriptsEnd: emit(
      ({
        context: {
          runScriptResults,
          totalScripts: total,
          runScriptManifestsByPkgManager,
        },
      }):
        | Event.CtrlExternalEvent<'RunScriptsFailed'>
        | Event.CtrlExternalEvent<'RunScriptsOk'> => {
        ok(runScriptResults?.length, 'No scripts were run. This is a bug');
        ok(total, 'No total scripts count. This is a bug');
        ok(
          runScriptManifestsByPkgManager,
          'No runScriptManifestsByPkgManager. This is a bug',
        );

        const [failedResults, otherResults] = partition(
          runScriptResults,
          'error',
        );
        const failed = failedResults.length;
        const [skippedResults, passedResults] = partition(otherResults, {
          skipped: true,
        });
        const passed = passedResults.length;
        const skipped = skippedResults.length;

        const type = failed
          ? SmokerEvent.RunScriptsFailed
          : SmokerEvent.RunScriptsOk;

        return {
          manifest: runScriptManifestsByPkgManager,
          type,
          results: runScriptResults,
          failed,
          passed,
          skipped,
          total,
        };
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
        {enqueue, context: {reporterMachines}},
        {output: {id}}: {output: RMOutput},
      ) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = reporterMachines;
        enqueue.assign({
          reporterMachines: rest,
        });
      },
    ),
    stopPkgManagerMachine: enqueueActions(
      (
        {enqueue, context: {pkgManagerMachines}},
        {output: {id}}: {output: PMMOutput},
      ) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = pkgManagerMachines;
        enqueue.assign({
          pkgManagerMachines: rest,
        });
      },
    ),
    spawnPkgManagerMachines: assign({
      pkgManagerMachines: (
        {
          self,
          context: {fm: fileManager, pkgManagers, rules, smokerOptions},
          spawn,
        },
        {
          installIncomplete,
          packIncomplete,
        }: {installIncomplete: Set<string>; packIncomplete: Set<string>},
      ) =>
        Object.fromEntries(
          pkgManagers.map((pkgManager, index) => {
            const id = `pkgManager.${MachineUtil.makeId()}`;
            const actor = spawn('pkgManager', {
              id,
              input: {
                pkgManager,
                fileManager,
                index: index + 1,
                parentRef: self,
                rules,
                ruleOptions: smokerOptions.rules,
              },
            });
            packIncomplete.add(id);
            installIncomplete.add(id);
            return [id, MachineUtil.monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),

    spawnReporterMachines: assign({
      reporterMachines: ({spawn, context: {reporters}, self}) =>
        Object.fromEntries(
          reporters.map((reporter) => {
            const id = `reporter.${MachineUtil.makeId()}`;
            const actor = spawn('reporter', {
              id,
              // @ts-expect-error https://github.com/statelyai/xstate/blob/main/packages/core/src/types.ts#L114 -- no TEmitted
              input: {emitter: self, reporter},
            });
            return [id, MachineUtil.monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),
    assignPluginLoaderResults: assign({
      pkgManagers: (_, output: PluginLoaderOutput) => {
        MachineUtil.assertMachineOutputOk(output);
        return output.pkgManagers;
      },
      reporters: (_, output: PluginLoaderOutput) => {
        MachineUtil.assertMachineOutputOk(output);
        return output.reporters;
      },
      rules: (_, output: PluginLoaderOutput) => {
        MachineUtil.assertMachineOutputOk(output);
        return output.rules;
      },
    }),
    spawnPluginLoaders: assign({
      pluginLoaderMachines: ({
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
            const id = `pluginLoader.${MachineUtil.makeId()}`;
            const actor = spawn('pluginLoader', {
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
    pkgManagerMachines: {},
    pluginLoaderMachines: {},
    reporterMachines: {},
    reporters: [],
    rules: [],
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

    HALT: {
      actions: [log('stopping...')],
      target: '.done',
    },

    LINT: {
      guard: {type: 'didNotLint'},
      actions: [assign({shouldLint: true}), log('will lint')],
    },

    'xstate.done.actor.reporter.*': [
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
    'xstate.done.actor.pkgManager.*': [
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
      {
        actions: [{type: 'stopPkgManagerMachine', params: ({event}) => event}],
      },
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
            'xstate.done.actor.pluginLoader.*': [
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
          entry: [
            assign({
              installIncomplete: new Set(),
              packIncomplete: new Set(),
            }),
            {
              type: 'spawnPkgManagerMachines',
              params: ({context: {installIncomplete, packIncomplete}}) => {
                ok(
                  installIncomplete,
                  'installIncomplete not set. This is a bug',
                );
                ok(packIncomplete, 'packIncomplete not set. This is a bug');
                return {
                  installIncomplete,
                  packIncomplete,
                };
              },
            },
            log(
              ({context}) =>
                `spawned ${context.pkgManagers.length} pkgManager machines`,
            ),
            {
              type: 'spawnReporterMachines',
            },
            emit(
              ({
                context: {pkgManagers, packOptions},
              }): Event.CtrlExternalEvent<'PackBegin'> => ({
                pkgManagers: pkgManagers.map(
                  (pkgManager) => pkgManager.staticSpec,
                ),
                type: SmokerEvent.PackBegin,
                packOptions,
              }),
            ),
          ],
          type: 'final',
        },
      },
      onDone: {
        target: 'setup',
        actions: [log('done loading components')],
      },
    },
    setup: {
      entry: [log('performing packing and installation...')],
      on: {
        PKG_MANAGER_PACK: {
          actions: [
            {type: 'emitPkgManagerPackBegin', params: ({event}) => event},
          ],
        },
        PKG_MANAGER_INSTALL: {
          actions: [
            {type: 'emitPkgManagerInstallBegin', params: ({event}) => event},
          ],
        },
        PKG_MANAGER_PACK_OK: [
          {
            guard: {type: 'isPackingIncomplete'},
            actions: [
              // {
              //   type: 'assignInstallManifests',
              //   params: ({event: {installManifests}}) => installManifests,
              // },
              {type: 'emitPkgManagerPackOk', params: ({event}) => event},
              {type: 'markPackComplete'},
            ],
          },
        ],
        PKG_MANAGER_PACK_FAILED: {
          actions: [
            {type: 'emitPkgManagerPackFailed', params: ({event}) => event},
            {type: 'emitPackFailed', params: ({event: {error}}) => ({error})},
          ],
          target: 'errored',
        },
        PKG_MANAGER_INSTALL_OK: [
          {
            guard: {type: 'isInstallingIncomplete'},
            actions: [
              {type: 'emitPkgManagerInstallOk', params: ({event}) => event},
              {type: 'markInstallComplete'},
            ],
          },
        ],
        PKG_MANAGER_INSTALL_FAILED: {
          actions: [
            {type: 'emitPkgManagerInstallFailed', params: ({event}) => event},
            {
              type: 'emitInstallFailed',
              params: ({event: {error}}) => ({error}),
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
      exit: [assign({installIncomplete: undefined, packIncomplete: undefined})],
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
      entry: [
        log('running scripts...'),
        {
          type: 'scriptsBegin',
          params: ({context: {scripts}}) => ({scripts: scripts!}),
        },
      ],
      on: {
        WILL_RUN_SCRIPT: {
          actions: [{type: 'emitScriptBegin', params: ({event}) => event}],
        },
        DID_RUN_SCRIPT_ERROR: {
          actions: [
            {
              type: 'assignError',
              params: ({
                event: {
                  output: {error},
                },
              }) => ({error}),
            },
          ],
        },
        DID_RUN_SCRIPT_BAILED: {
          actions: [log('bailed')],
          target: 'done',
        },
        DID_RUN_SCRIPT_RESULT: [
          {
            guard: {type: 'scriptFailed', params: ({event}) => event},
            actions: [{type: 'emitScriptFailed', params: ({event}) => event}],
          },
          {
            guard: {type: 'scriptSkipped', params: ({event}) => event},
            actions: [{type: 'emitScriptSkipped', params: ({event}) => event}],
          },
          {
            guard: {type: 'scriptOk', params: ({event}) => event},
            actions: [
              {type: 'emitScriptOk', params: ({event}) => event},
              {
                type: 'appendRunScriptResult',
                params: ({
                  event: {
                    output: {result},
                  },
                }) => result,
              },
            ],
          },
        ],
        DID_RUN_SCRIPTS: {
          actions: [log('done running scripts'), {type: 'emitScriptsEnd'}],
          // TODO: determine if we need to zap some stuff out of context
          target: 'ready',
        },
      },
    },
    linting: {
      entry: [log('linting...')],
    },
    done: {
      entry: [{type: 'emitBeforeExit'}, {type: 'cleanup'}],
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
