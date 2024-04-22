import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '#constants';
import {fromUnknownError} from '#error';
import {SmokerEvent} from '#event';
import {
  InstallerMachine,
  type InstallerMachineInput,
  type InstallerMachineInstallEvent,
} from '#machine/installer';
import {LinterMachine, type LinterMachineOutput} from '#machine/linter';
import {PackerMachine, type PackerMachineInput} from '#machine/packer';
import {
  PluginLoaderMachine,
  type PluginLoaderMachineInput,
} from '#machine/plugin-loader';
import {ReporterMachine, type ReporterMachineOutput} from '#machine/reporter';
import {RunnerMachine, type RunnerMachineOutput} from '#machine/runner';
import * as MachineUtil from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PkgManager} from '#pkg-manager';
import {type PluginRegistry} from '#plugin';
import {type SomeReporter} from '#reporter/reporter';
import {
  type Executor,
  type InstallEventBaseData,
  type InstallManifest,
  type LintManifest,
  type LintResult,
  type RunScriptManifest,
  type RunScriptResult,
  type SomeRule,
} from '#schema';
import {type FileManager} from '#util/filemanager';
import {filter, isEmpty, map, memoize, partition, sumBy, uniq} from 'lodash';
import assert from 'node:assert';
import {
  and,
  assign,
  enqueueActions,
  log,
  not,
  raise,
  sendTo,
  setup,
  type ActorRefFrom,
} from 'xstate';
import type * as Event from './control-machine-events';

export interface CtrlMachineInput {
  defaultExecutorId?: string;

  fileManager: FileManager;

  pluginRegistry: PluginRegistry;

  smokerOptions: SmokerOptions;

  systemExecutorId?: string;
}

export type CtrlMachineContext = Omit<
  CtrlMachineInput,
  'defaultExecutorId' | 'systemExecutorId' | 'fileManagerOpts'
> & {
  pkgManagers: PkgManager[];
  defaultExecutor: Executor;
  systemExecutor: Executor;
  reporterMachineRefs: Record<string, ActorRefFrom<typeof ReporterMachine>>;
  runnerMachineRefs: Record<string, ActorRefFrom<typeof RunnerMachine>>;
  linterMachineRefs: Record<string, ActorRefFrom<typeof LinterMachine>>;
  runScriptManifests: WeakMap<PkgManager, RunScriptManifest[]>;
  lintManifests: WeakMap<PkgManager, LintManifest[]>;
  reporters: SomeReporter[];
  rules: SomeRule[];
  shouldLint: boolean;
  scripts: string[];
  error?: Error;
  runScriptResults?: RunScriptResult[];
  lintResult?: LintResult;
  totalChecks: number;

  shouldHalt: boolean;
  packerMachineRef?: ActorRefFrom<typeof PackerMachine>;
  installerMachineRef?: ActorRefFrom<typeof InstallerMachine>;
  pluginLoaderRef?: ActorRefFrom<typeof PluginLoaderMachine>;
  startTime: number;
};

export type CtrlOutputOk = MachineUtil.MachineOutputOk<{
  lintResult?: LintResult;
  runScriptResults?: RunScriptResult[];
}>;

export type CtrlOutputError = MachineUtil.MachineOutputError;

export type CtrlMachineOutput = CtrlOutputOk | CtrlOutputError;

export const ControlMachine = setup({
  types: {
    context: {} as CtrlMachineContext,
    emitted: {} as Event.CtrlEmitted,
    events: {} as Event.CtrlEvents,
    input: {} as CtrlMachineInput,
    output: {} as CtrlMachineOutput,
  },
  actors: {
    ReporterMachine,
    PluginLoaderMachine,
    RunnerMachine,
    PackerMachine,
    InstallerMachine,
    LinterMachine,
  },
  guards: {
    /**
     * If `true`, then the machine has rules to lint against.
     */
    hasRules: ({context: {rules}}) => !isEmpty(rules),

    /**
     * If `true`, then the machine has performed a lint operation.
     */
    didLint: ({context: {lintResult}}) => !isEmpty(lintResult),

    /**
     * If `true`, then the machine has not performed a lint operation.
     */
    didNotLint: not('didLint'),

    /**
     * If `true`, then the `LINT` event was received.
     */
    shouldLint: ({context: {shouldLint}}) => shouldLint,

    /**
     * If `true`, then the `HALT` event was received.
     */
    shouldHalt: ({context: {shouldHalt}}) => shouldHalt,

    /**
     * If `true`, all workspaces have been packed
     */
    isPackingComplete: ({context: {packerMachineRef}}) => !packerMachineRef,

    /**
     * If `true`, all packed workspaces have been installed from tarballs
     */
    isInstallingComplete: ({context: {installerMachineRef}}) =>
      !installerMachineRef,

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

    /**
     * If `true`, then package managers are ready for use.
     */
    hasPkgManagers: ({context: {pkgManagers}}) => !isEmpty(pkgManagers),

    /**
     * If `true`, then the machine can run scripts.
     */
    canRunScripts: and([
      'hasPkgManagers',
      'shouldRunScripts',
      'hasNoScriptResults',
    ]),

    /**
     * If `true`, then the machine can lint.
     */
    canLint: and(['hasPkgManagers', 'shouldLint', 'hasRules', 'didNotLint']),

    /**
     * If `true`, then the machine should lint, but it can't--because there are
     * no rules.
     */
    cannotLint: and(['shouldLint', not('hasRules')]),
    isMachineOutputOk: (_, output: MachineUtil.MachineOutput) =>
      MachineUtil.isMachineOutputOk(output),
    isMachineOutputNotOk: (_, output: MachineUtil.MachineOutput): boolean =>
      MachineUtil.isMachineOutputNotOk(output),
    hasError: ({context: {error}}) => Boolean(error),

    /**
     * If `true`, the machine is ready to run scripts and/or lint.
     */
    isReady: and(['isPackingComplete', 'isInstallingComplete']),
    notHasError: not('hasError'),

    /**
     * If `true`, then script-running is complete
     */
    didRunScripts: and(['isNotRunningScripts', 'hasScriptResults']),

    /**
     * If `true`, no script-runner actors are active
     */
    isNotRunningScripts: ({context: {runnerMachineRefs}}) =>
      isEmpty(runnerMachineRefs),

    /**
     * If `true`, no linter actors are active.
     */
    isNotLinting: ({context: {linterMachineRefs}}) =>
      isEmpty(linterMachineRefs),

    hasPluginLoaderRef: ({context: {pluginLoaderRef}}) =>
      Boolean(pluginLoaderRef),

    hasReporterRefs: ({context: {reporterMachineRefs}}) =>
      !isEmpty(reporterMachineRefs),
  },
  actions: {
    assignLintResult: assign({
      lintResult: (
        {context: {lintResult = {passed: [], issues: []}}},
        newLintResult: LintResult,
      ) => {
        return {
          passed: [...lintResult.passed, ...newLintResult.passed],
          issues: [...lintResult.issues, ...newLintResult.issues],
        };
      },
    }),
    flushReporters: enqueueActions(
      ({enqueue, context: {reporterMachineRefs}}) => {
        Object.values(reporterMachineRefs).forEach((reporterMachine) => {
          enqueue.sendTo(reporterMachine, {type: 'HALT'});
        });
      },
    ),
    teardown: sendTo(
      ({context: {pluginLoaderRef}}) => {
        assert.ok(pluginLoaderRef);
        return pluginLoaderRef;
      },
      {type: 'TEARDOWN'},
    ),

    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),

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
            pkgManager.pkgInstallManifests.map(
              ({installPath, pkgName, localPath}) => ({
                installPath,
                pkgName,
                localPath,
              }),
            ),
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
    stopPluginLoaderMachine: enqueueActions(
      ({enqueue, context: {pluginLoaderRef}}) => {
        if (pluginLoaderRef) {
          enqueue.stopChild(pluginLoaderRef.id);
          enqueue.assign({pluginLoaderRef: undefined});
        }
      },
    ),
    spawnReporterMachines: assign({
      reporterMachineRefs: ({spawn, context: {reporters}, self}) =>
        Object.fromEntries(
          reporters.map((reporter) => {
            const id = `ReporterMachine.${MachineUtil.makeId()}`;
            // @ts-expect-error https://github.com/statelyai/xstate/blob/main/packages/core/src/types.ts#L114 -- no TEmitted
            const actor = spawn('ReporterMachine', {
              id,
              input: {emitter: self, reporter},
            });
            return [id, MachineUtil.monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),
    assignComponents: enqueueActions(
      (
        {enqueue, context},
        {
          pkgManagers,
          reporters,
          rules,
        }: {
          pkgManagers: PkgManager[];
          reporters: SomeReporter[];
          rules: SomeRule[];
        },
      ) => {
        enqueue.assign({
          pkgManagers: [...(context.pkgManagers ?? []), ...pkgManagers],
          reporters: [...(context.reporters ?? []), ...reporters],
          rules: [...(context.rules ?? []), ...rules],
        });
      },
    ),
    spawnLinterMachines: assign({
      linterMachineRefs: ({
        context: {
          pkgManagers,
          rules,
          lintManifests,
          fileManager,
          smokerOptions: {rules: ruleConfigs},
        },
        self,
        spawn,
      }) =>
        Object.fromEntries(
          pkgManagers.map((pkgManager, index) => {
            const id = `LinterMachine.${MachineUtil.makeId()}`;

            const manifests = lintManifests.get(pkgManager);
            assert.ok(manifests);
            const actorRef = spawn('LinterMachine', {
              id,
              input: {
                pkgManager,
                ruleConfigs,
                lintManifests: manifests,
                fileManager,
                rules,
                parentRef: self,
                index: index + 1,
              },
            });
            return [id, MachineUtil.monkeypatchActorLogger(actorRef, id)];
          }),
        ),
    }),
    stopLinterMachine: enqueueActions(
      (
        {enqueue, context: {linterMachineRefs}},
        {output: {id}}: {output: LinterMachineOutput},
      ) => {
        enqueue.stopChild(id);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = linterMachineRefs;
        enqueue.assign({
          linterMachineRefs: rest,
        });
      },
    ),
    report: enqueueActions(
      ({enqueue, context: {reporterMachineRefs}}, event: Event.CtrlEmitted) => {
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

    assignSetupActors: assign({
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
        context: {
          smokerOptions: {
            all: allWorkspaces,
            includeRoot: includeWorkspaceRoot,
            workspace: workspaces,
            cwd,
          },
          pkgManagers,
        },
      }) => {
        const input: PackerMachineInput = {
          opts: {allWorkspaces, includeWorkspaceRoot, workspaces, cwd},
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
    sendPackingComplete: sendTo(
      ({context: {installerMachineRef}}) => {
        assert.ok(installerMachineRef);
        return installerMachineRef;
      },
      {type: 'PACKING_COMPLETE'},
    ),
    beginInstallation: sendTo(
      ({context: {installerMachineRef}}) => {
        assert.ok(installerMachineRef);
        return installerMachineRef;
      },
      (
        _,
        {
          pkgManager,
          installManifests,
        }: {pkgManager: PkgManager; installManifests: InstallManifest[]},
      ): InstallerMachineInstallEvent => ({
        type: 'INSTALL',
        pkgManager,
        installManifests,
      }),
    ),
  },
}).createMachine({
  id: 'ControlMachine',
  context: ({
    input: {
      pluginRegistry,
      defaultExecutorId = DEFAULT_EXECUTOR_ID,
      systemExecutorId = SYSTEM_EXECUTOR_ID,
      smokerOptions,
      fileManager,
    },
  }): CtrlMachineContext => ({
    pluginRegistry,
    smokerOptions,

    defaultExecutor: pluginRegistry.getExecutor(defaultExecutorId),
    systemExecutor: pluginRegistry.getExecutor(systemExecutorId),
    fileManager,
    shouldLint: false,
    pkgManagers: [],
    runnerMachineRefs: {},
    reporterMachineRefs: {},
    reporters: [],
    rules: [],
    scripts: [],
    runScriptManifests: new WeakMap(),
    lintManifests: new WeakMap(),
    totalChecks: 0,
    linterMachineRefs: {},
    shouldHalt: false,
    startTime: performance.now(),
  }),
  initial: 'loading',
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

    LINT: [
      {
        guard: 'didNotLint',
        actions: [{type: 'shouldLint'}, log('will lint')],
      },
      {
        guard: 'didLint',
        actions: [log('already linted')], // TODO better warning
      },
    ],

    HALT: {
      actions: [log('will close when ready'), {type: 'shouldHalt'}],
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
          {type: 'stopReporterMachine', params: ({event}) => event},
        ],
        target: '#ControlMachine.done',
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

    'xstate.done.actor.PluginLoaderMachine': [
      {
        guard: {
          type: 'isMachineOutputOk',
          params: ({event: {output}}) => output,
        },
        actions: [
          {type: 'stopPluginLoaderMachine'},
          log('unloading plugin loader'),
        ],
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
              MachineUtil.assertMachineOutputNotOk(output);
              return {error: output.error};
            },
          },
          {type: 'stopPluginLoaderMachine'},
          log('unloading plugin loader'),
        ],
      },
    ],
  },
  states: {
    loading: {
      description:
        'Spawns a PluginLoaderMachine, which provides reified components',
      entry: [
        log('loading plugin components...'),

        assign({
          pluginLoaderRef: ({
            self,
            spawn,
            context: {
              pluginRegistry,
              smokerOptions,
              fileManager,
              systemExecutor,
              defaultExecutor,
            },
          }) => {
            const input: PluginLoaderMachineInput = {
              pluginRegistry,
              smokerOptions,
              fileManager,
              systemExecutor,
              defaultExecutor,
              parentRef: self,
            };
            const id = 'PluginLoaderMachine';
            const actorRef = spawn('PluginLoaderMachine', {
              id,
              input,
            });
            return MachineUtil.monkeypatchActorLogger(actorRef, id);
          },
        }),
      ],
      on: {
        COMPONENTS: {
          actions: [
            {
              type: 'assignComponents',
              params: ({event}) => event,
            },
            log('components loaded'),
            {
              type: 'spawnReporterMachines',
            },
          ],
          target: 'setup',
        },
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
        {
          type: 'assignSetupActors',
        },
      ],
      on: {
        PACK_OK: {
          actions: [
            {
              type: 'report',
              params: ({
                context,
                event: {manifests},
              }): Event.CtrlExternalEvent<typeof SmokerEvent.PackOk> => {
                return {
                  uniquePkgs: MachineUtil.uniquePkgNames(manifests),
                  type: SmokerEvent.PackOk,
                  pkgManagers: map(context.pkgManagers, 'staticSpec'),
                  manifests,
                  totalPkgs: manifests.length,
                };
              },
            },
            {
              type: 'sendPackingComplete',
            },
            {
              type: 'stopPackerMachine',
            },
          ],
        },
        PACK_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers,
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    includeRoot: includeWorkspaceRoot,
                    workspace: workspaces,
                  },
                },
                event: {error},
              }): Event.CtrlExternalEvent<typeof SmokerEvent.PackFailed> => {
                return {
                  error,
                  type: SmokerEvent.PackFailed,
                  packOptions: {
                    cwd,
                    allWorkspaces,
                    includeWorkspaceRoot,
                    workspaces,
                  },
                  pkgManagers: map(pkgManagers, 'staticSpec'),
                };
              },
            },
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
            {
              type: 'stopPackerMachine',
            },
          ],
          target: '#ControlMachine.done',
        },
        'xstate.done.actor.PackerMachine': [
          {
            guard: {
              type: 'isMachineOutputOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              raise(({event: {output}}) => {
                MachineUtil.assertMachineOutputOk(output);
                return {
                  type: 'PACK_OK',
                  manifests: output.manifests,
                };
              }),
            ],
          },
          {
            guard: {
              type: 'isMachineOutputNotOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              raise(({event: {output}}) => {
                MachineUtil.assertMachineOutputNotOk(output);
                return {
                  type: 'PACK_FAILED',
                  error: output.error,
                };
              }),
            ],
          },
        ],
        INSTALL_OK: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers},
                event: {manifests},
              }): Event.CtrlExternalEvent<typeof SmokerEvent.InstallOk> => {
                const [additionalDeps, pkgs] = partition(
                  manifests,
                  'isAdditional',
                );
                const uniquePkgs: string[] = MachineUtil.uniquePkgNames(pkgs);
                const uniqueAdditionalDeps =
                  MachineUtil.uniquePkgNames(additionalDeps);
                return {
                  type: SmokerEvent.InstallOk,
                  uniquePkgs,
                  pkgManagers: map(pkgManagers, 'staticSpec'),
                  manifests,
                  totalPkgs: manifests.length,
                  additionalDeps: uniqueAdditionalDeps,
                };
              },
            },
            {
              type: 'stopInstallerMachine',
            },
          ],
        },
        INSTALL_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers},
                event: {error},
              }): Event.CtrlExternalEvent<typeof SmokerEvent.InstallFailed> => {
                return {
                  error,
                  type: SmokerEvent.InstallFailed,
                  ...buildInstallEventData(pkgManagers),
                };
              },
            },
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
            {
              type: 'stopInstallerMachine',
            },
          ],
          target: '#ControlMachine.done',
        },
        'xstate.done.actor.InstallerMachine': [
          {
            guard: {
              type: 'isMachineOutputOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              raise(({event: {output}}) => {
                MachineUtil.assertMachineOutputOk(output);
                return {
                  type: 'INSTALL_OK',
                  manifests: output.manifests,
                };
              }),
            ],
          },
          {
            guard: {
              type: 'isMachineOutputNotOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              raise(({event: {output}}) => {
                MachineUtil.assertMachineOutputNotOk(output);
                return {
                  type: 'INSTALL_FAILED',
                  error: output.error,
                };
              }),
            ],
          },
        ],
        PACK_BEGIN: {
          actions: [
            log('received PACK_BEGIN'),
            {
              type: 'report',
              params: ({
                context: {
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    includeRoot: includeWorkspaceRoot,
                    workspace: workspaces,
                  },
                  pkgManagers,
                },
              }): Event.CtrlExternalEvent<typeof SmokerEvent.PackBegin> => ({
                type: SmokerEvent.PackBegin,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  includeWorkspaceRoot,
                  workspaces,
                },
                pkgManagers: map(pkgManagers, 'staticSpec'),
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
                ...buildInstallEventData(pkgManagers),
              }),
            },
          ],
        },
        PKG_MANAGER_PACK_BEGIN: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers,
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    includeRoot: includeWorkspaceRoot,
                    workspace: workspaces,
                  },
                },
                event: {index, pkgManager},
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerPackBegin
              > => ({
                type: SmokerEvent.PkgManagerPackBegin,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  includeWorkspaceRoot,
                  workspaces,
                },
                totalPkgManagers: pkgManagers.length,
              }),
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
        PKG_MANAGER_PACK_OK: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers,
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    includeRoot: includeWorkspaceRoot,
                    workspace: workspaces,
                  },
                },
                event: {index, pkgManager, installManifests},
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerPackOk
              > => ({
                type: SmokerEvent.PkgManagerPackOk,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                packOptions: {
                  allWorkspaces,
                  cwd,
                  includeWorkspaceRoot,
                  workspaces,
                },
                manifests: installManifests,
                totalPkgManagers: pkgManagers.length,
              }),
            },
            {
              type: 'beginInstallation',
              params: ({event: {pkgManager, installManifests}}) => ({
                pkgManager,
                installManifests,
              }),
            },
          ],
        },
        PKG_MANAGER_PACK_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  pkgManagers,
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    includeRoot: includeWorkspaceRoot,
                    workspace: workspaces,
                  },
                },
                event: {index, pkgManager, error},
              }): Event.CtrlExternalEvent<
                typeof SmokerEvent.PkgManagerPackFailed
              > => ({
                type: SmokerEvent.PkgManagerPackFailed,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  includeWorkspaceRoot,
                  workspaces,
                },
                error,
                totalPkgManagers: pkgManagers.length,
              }),
            },
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
          ],
          target: '#ControlMachine.done',
        },
        PKG_MANAGER_INSTALL_OK: {
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
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
          ],
          target: '#ControlMachine.done',
        },
      },
      always: [
        {
          target: '#ControlMachine.ready',
          guard: {type: 'isReady'},
          actions: [log('all pkg manager machines in ready state')],
        },
      ],
    },
    ready: {
      entry: [log('ready for events')],
      always: [
        {
          guard: {type: 'canRunScripts'},
          target: '#ControlMachine.runningScripts',
        },
        {
          guard: {type: 'canLint'},
          target: '#ControlMachine.linting',
        },
        {
          guard: {type: 'cannotLint'},
          actions: log('no rules to lint with!'),
        },
        {
          guard: {type: 'shouldHalt'},
          target: '#ControlMachine.done',
        },
      ],
    },
    runningScripts: {
      initial: 'working',
      states: {
        working: {
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
                      totalUniquePkgs:
                        MachineUtil.uniquePkgNames(manifests).length,
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
                      totalUniquePkgs:
                        MachineUtil.uniquePkgNames(manifests).length,
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
              guard: {type: 'didRunScripts'},
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
                      results: runScriptResults,
                    };
                  },
                },
              ],
              target: '#ControlMachine.runningScripts.done',
            },
          ],
        },
        done: {
          type: 'final',
        },
      },
      onDone: {
        target: '#ControlMachine.ready',
      },
    },
    linting: {
      initial: 'working',
      states: {
        working: {
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
            {
              type: 'spawnLinterMachines',
            },
          ],
          on: {
            'xstate.done.actor.LinterMachine.*': [
              {
                guard: {
                  type: 'isMachineOutputOk',
                  params: ({event: {output}}) => output,
                },
                actions: [
                  {
                    type: 'assignLintResult',
                    params: ({event: {output}}) => {
                      MachineUtil.assertMachineOutputOk(output);
                      return output.lintResult;
                    },
                  },
                  {
                    type: 'report',
                    params: ({
                      context: {pkgManagers, rules, totalChecks},
                      event: {output},
                    }): Event.CtrlExternalEvent<
                      | typeof SmokerEvent.PkgManagerLintOk
                      | typeof SmokerEvent.PkgManagerLintFailed
                    > => {
                      MachineUtil.assertMachineOutputOk(output);
                      const {
                        pkgManager,
                        pkgManagerIndex,
                        lintResult: {passed, issues},
                        didFail,
                      } = output;
                      const type = didFail
                        ? SmokerEvent.PkgManagerLintFailed
                        : SmokerEvent.PkgManagerLintOk;
                      return {
                        type,
                        pkgManager: pkgManager.staticSpec,
                        totalPkgManagers: pkgManagers.length,
                        totalRules: rules.length,
                        passed,
                        issues,
                        totalPkgManagerChecks: totalChecks / rules.length,
                        currentPkgManager: pkgManagerIndex,
                      };
                    },
                  },
                  {
                    type: 'stopLinterMachine',
                    params: ({event}) => event,
                  },
                ],
              },
            ],
            RULE_BEGIN: {
              actions: [
                log(
                  ({event}) => `rule begin: ${event.rule} from ${event.sender}`,
                ),
                {
                  type: 'report',
                  params: ({
                    context: {
                      rules: {length: totalRules},
                    },
                    event,
                  }): Event.CtrlExternalEvent<typeof SmokerEvent.RuleBegin> => {
                    return {
                      ...event,
                      totalRules,
                      type: SmokerEvent.RuleBegin,
                    };
                  },
                },
              ],
            },
            RULE_FAILED: {
              actions: [
                log(
                  ({event}) =>
                    `rule failed: ${event.rule} from ${event.sender}`,
                ),
                {
                  type: 'report',
                  params: ({
                    context: {
                      rules: {length: totalRules},
                    },
                    event,
                  }): Event.CtrlExternalEvent<
                    typeof SmokerEvent.RuleFailed
                  > => {
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
          },
          always: [
            {
              guard: {type: 'didLint'},
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      smokerOptions,
                      rules: {length: totalRules},
                      lintResult,
                      pkgManagers,
                      totalChecks,
                    },
                  }): Event.CtrlExternalEvent<
                    typeof SmokerEvent.LintOk | typeof SmokerEvent.LintFailed
                  > => {
                    assert.ok(lintResult);
                    const type = isEmpty(lintResult.issues)
                      ? SmokerEvent.LintOk
                      : SmokerEvent.LintFailed;

                    return {
                      type,
                      result: lintResult,
                      totalPkgManagers: pkgManagers.length,
                      config: smokerOptions.rules,
                      totalRules,
                      totalUniquePkgs: totalChecks / totalRules,
                    };
                  },
                },
              ],
              target: '#ControlMachine.linting.done',
            },
          ],
        },
        done: {
          type: 'final',
        },
      },
      onDone: {
        target: '#ControlMachine.ready',
      },
    },
    done: {
      initial: 'flushReporters',
      states: {
        flushReporters: {
          entry: [
            log('cleaning up...'),
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
              guard: and([
                'notHasError',
                'hasPluginLoaderRef',
                not('hasReporterRefs'),
              ]),
              target: '#ControlMachine.done.teardown',
            },
            {
              guard: and(['hasError', not('hasPluginLoaderRef')]),
              target: '#ControlMachine.done.errored',
            },
          ],
        },
        teardown: {
          entry: [{type: 'teardown'}],
          always: [
            {
              guard: and(['notHasError', not('hasPluginLoaderRef')]),
              target: '#ControlMachine.done.complete',
            },
            {
              guard: and(['hasError', not('hasPluginLoaderRef')]),
              target: '#ControlMachine.done.errored',
            },
          ],
        },
        errored: {
          entry: [log('error!')],
          type: 'final',
        },
        complete: {
          entry: [
            log(({context: {startTime}}) => {
              const sec = ((performance.now() - startTime) / 1000).toFixed(2);
              return `complete in ${sec}s`;
            }),
          ],
          type: 'final',
        },
      },
    },
  },
  output: ({
    self: {id},
    context: {error, lintResult, runScriptResults},
  }): CtrlMachineOutput => {
    return error
      ? {type: 'ERROR', error, id}
      : {type: 'OK', id, lintResult, runScriptResults};
  },
});

const buildInstallEventData = memoize(
  (pkgManagers: PkgManager[]): Readonly<InstallEventBaseData> => {
    const manifests = pkgManagers.flatMap(
      ({installManifests}) => installManifests,
    );

    const additionalDeps = uniq(
      map(filter(manifests, {isAdditional: true}), 'pkgName'),
    );
    const uniquePkgs = MachineUtil.uniquePkgNames(manifests);
    const specs = map(pkgManagers, 'staticSpec');

    return Object.freeze({
      uniquePkgs,
      pkgManagers: specs,
      additionalDeps,
      manifests,
      totalPkgs: pkgManagers.length * manifests.length,
    });
  },
);