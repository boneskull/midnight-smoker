import {
  DEFAULT_EXECUTOR_ID,
  PACKAGE_JSON,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {fromUnknownError} from '#error';
import {SmokerEvent, type EventData} from '#event';
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
  WorkspacesConfigSchema,
  type Executor,
  type InstallManifest,
  type LintManifest,
  type LintResult,
  type RunScriptManifest,
  type RunScriptResult,
  type SomeRule,
  type WorkspaceInfo,
} from '#schema';
import {FileManager} from '#util/filemanager';
import {glob} from 'glob';
import {isEmpty, map, partition, sumBy} from 'lodash';
import {minimatch} from 'minimatch';
import assert from 'node:assert';
import path from 'node:path';
import {
  and,
  assign,
  enqueueActions,
  fromPromise,
  log,
  not,
  raise,
  sendTo,
  setup,
  type ActorRefFrom,
} from 'xstate';
import type * as Event from './control-machine-events';
import {
  appendAdditionalDeps,
  buildInstallEventData,
  buildRunScriptManifests,
} from './control-machine-util';

export interface CtrlMachineInput {
  pluginRegistry: PluginRegistry;

  smokerOptions: SmokerOptions;

  fileManager?: FileManager;
  defaultExecutor?: Executor;
  systemExecutor?: Executor;
}

export interface CtrlMachineContext extends CtrlMachineInput {
  fileManager: FileManager;
  pkgManagers: PkgManager[];
  defaultExecutor: Executor;
  systemExecutor: Executor;
  reporterMachineRefs: Record<string, ActorRefFrom<typeof ReporterMachine>>;
  runnerMachineRefs: Record<string, ActorRefFrom<typeof RunnerMachine>>;
  linterMachineRefs: Record<string, ActorRefFrom<typeof LinterMachine>>;
  installManifestMap: WeakMap<PkgManager, InstallManifest[]>;
  scriptManifestMap: WeakMap<PkgManager, RunScriptManifest[]>;
  lintManifestMap: WeakMap<PkgManager, LintManifest[]>;
  reporters: SomeReporter[];
  rules: SomeRule[];
  shouldLint: boolean;
  scripts: string[];
  error?: Error;
  runScriptResults?: RunScriptResult[];
  lintResult?: LintResult;
  totalChecks: number;

  workspaceInfo: WorkspaceInfo[];
  shouldHalt: boolean;
  packerMachineRef?: ActorRefFrom<typeof PackerMachine>;
  installerMachineRef?: ActorRefFrom<typeof InstallerMachine>;
  pluginMachineLoaderRef?: ActorRefFrom<typeof PluginLoaderMachine>;
  startTime: number;
}

export type CtrlOutputOk = MachineUtil.ActorOutputOk<{
  lintResult?: LintResult;
  runScriptResults?: RunScriptResult[];
}>;

export type CtrlOutputError = MachineUtil.ActorOutputError;

export type CtrlMachineOutput = CtrlOutputOk | CtrlOutputError;

export interface QueryWorkspacesInput {
  cwd: string;
  fileManager: FileManager;
  workspace: string[];
  all: boolean;
}

export const queryWorkspaces = fromPromise<
  WorkspaceInfo[],
  QueryWorkspacesInput
>(
  async ({
    input: {
      cwd,
      fileManager: fm,
      all: allWorkspaces,
      workspace: onlyWorkspaces,
    },
  }): Promise<WorkspaceInfo[]> => {
    const {packageJson: rootPkgJson, path: rootPkgJsonPath} =
      await fm.findPkgUp(cwd, {
        strict: true,
        normalize: true,
      });

    const getWorkspaceInfo = async (
      patterns: string[],
      pickPkgNames: string[] = [],
    ): Promise<WorkspaceInfo[]> => {
      const workspacePaths = await glob(patterns, {
        cwd,
        withFileTypes: true,
      });
      let workspaces = await Promise.all(
        workspacePaths
          .filter((workspace) => workspace.isDirectory())
          .map(async (workspace) => {
            const fullpath = workspace.fullpath();
            const pkgJsonPath = path.join(fullpath, PACKAGE_JSON);
            const workspacePkgJson = await fm.readPkgJson(pkgJsonPath);
            assert.ok(
              workspacePkgJson.name,
              `no package name in workspace ${PACKAGE_JSON}: ${pkgJsonPath}`,
            );
            return {
              pkgName: workspacePkgJson.name,
              localPath: fullpath,
            } as WorkspaceInfo;
          }),
      );
      if (!isEmpty(pickPkgNames)) {
        workspaces = workspaces.filter(({pkgName}) =>
          pickPkgNames.includes(pkgName),
        );
      }
      return workspaces;
    };

    const result = WorkspacesConfigSchema.safeParse(rootPkgJson.workspaces);

    let patterns: string[] = [];
    if (result.success) {
      patterns = result.data;
      // if (includeWorkspaceRoot) {
      //   assert.ok(
      //     rootPkgJson.name,
      //     `no package name in root ${PACKAGE_JSON}: ${rootPkgJsonPath}`,
      //   );

      //   patterns = [cwd, ...patterns];
      // }
      if (allWorkspaces) {
        return getWorkspaceInfo(patterns);
      }
      if (!isEmpty(onlyWorkspaces)) {
        // a workspace, per npm's CLI, can be a package name _or_ a path.
        // we can detect a path by checking if any of the workspace patterns
        // in the root package.json match the workspace.
        const [pickPaths, pickPkgNames] = partition(
          onlyWorkspaces.map((onlyWs) =>
            path.isAbsolute(onlyWs) ? path.relative(cwd, onlyWs) : onlyWs,
          ),
          (onlyWs) => patterns.some((ws) => minimatch(onlyWs, ws)),
        );

        if (isEmpty(pickPaths)) {
          if (isEmpty(pickPkgNames)) {
            // TODO this might be an error; SOMETHING should match
          }
          return getWorkspaceInfo(patterns, pickPkgNames);
        }
        return getWorkspaceInfo(pickPaths, pickPkgNames);
      }
      // if we get here, then `workspaces` in the root package.json is just empty
    }

    assert.ok(
      rootPkgJson.name,
      `no package name in root ${PACKAGE_JSON}: ${rootPkgJsonPath}`,
    );

    return [
      {
        pkgName: rootPkgJson.name,
        localPath: cwd,
      } as WorkspaceInfo,
    ];
  },
);

export const ControlMachine = setup({
  types: {
    context: {} as CtrlMachineContext,
    emitted: {} as Event.ControlMachineEmitted,
    events: {} as Event.CtrlEvents,
    input: {} as CtrlMachineInput,
    output: {} as CtrlMachineOutput,
  },
  actors: {
    queryWorkspaces,
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

    isMachineOutputOk: (_, output: MachineUtil.ActorOutput) =>
      MachineUtil.isActorOutputOk(output),

    isMachineOutputNotOk: (_, output: MachineUtil.ActorOutput): boolean =>
      MachineUtil.isActorOutputNotOk(output),

    hasError: ({context: {error}}) => Boolean(error),

    notHasError: not('hasError'),

    /**
     * If `true`, the machine is ready to run scripts and/or lint.
     */
    isReady: and(['isPackingComplete', 'isInstallingComplete']),

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

    hasPluginLoaderRef: ({
      context: {pluginMachineLoaderRef: pluginLoaderRef},
    }) => Boolean(pluginLoaderRef),

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
      ({context: {pluginMachineLoaderRef: pluginLoaderRef}}) => {
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

    assignInstallManifests: assign({
      installManifestMap: (
        {context: {installManifestMap}},
        {
          pkgManager,
          installManifests,
        }: {pkgManager: PkgManager; installManifests: InstallManifest[]},
      ) => {
        installManifestMap.set(pkgManager, installManifests);
        return installManifestMap;
      },
    }),

    assignRunScriptManifests: assign({
      scriptManifestMap: ({
        context: {pkgManagers, scripts, installManifestMap},
      }) =>
        new WeakMap(
          pkgManagers.map((pkgManager) => {
            const installManifests = installManifestMap.get(pkgManager);
            assert.ok(installManifests);
            return [
              pkgManager,
              buildRunScriptManifests(scripts, installManifests),
            ];
          }),
        ),
    }),

    assignTotalChecks: assign({
      totalChecks: ({context: {pkgManagers, rules, lintManifestMap}}) => {
        return (
          rules.length *
          sumBy(
            pkgManagers,
            (pkgManager) => lintManifestMap.get(pkgManager)?.length ?? 0,
          )
        );
      },
    }),

    assignLintManifests: assign({
      lintManifestMap: ({context: {pkgManagers, installManifestMap}}) => {
        const lintManifestMap = new WeakMap<PkgManager, LintManifest[]>();
        for (const pkgManager of pkgManagers) {
          const lintManifests = installManifestMap
            .get(pkgManager)
            ?.filter(({isAdditional, installPath}) => {
              return Boolean(installPath && !isAdditional);
            })
            .map(({installPath, pkgName, localPath}) => {
              if (!localPath) {
                throw new TypeError('expected localPath');
              }

              return {
                installPath,
                pkgName,
                localPath,
              } as LintManifest;
            });
          assert.ok(lintManifests);
          lintManifestMap.set(pkgManager, lintManifests);
        }
        return lintManifestMap;
      },
    }),

    spawnRunnerMachines: assign({
      runnerMachineRefs: ({
        context: {pkgManagers, scriptManifestMap},
        self,
        spawn,
      }) => {
        const ac = new AbortController();
        return Object.fromEntries(
          pkgManagers.map((pkgManager, index) => {
            const manifests = scriptManifestMap.get(pkgManager);
            assert.ok(manifests);
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
      ({enqueue, context: {pluginMachineLoaderRef: pluginLoaderRef}}) => {
        if (pluginLoaderRef) {
          enqueue.stopChild(pluginLoaderRef.id);
          enqueue.assign({pluginMachineLoaderRef: undefined});
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
          lintManifestMap: lintManifests,
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
                workspaceInfo: MachineUtil.asWorkspacesInfo(manifests),
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
          smokerOptions: {all: allWorkspaces, workspace: workspaces, cwd},
          workspaceInfo,
          pkgManagers,
        },
      }) => {
        const input: PackerMachineInput = {
          opts: {allWorkspaces, workspaces, cwd},
          pkgManagers,
          signal: new AbortController().signal,
          workspaceInfo,
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
        {
          context: {
            smokerOptions: {add},
          },
        },
        {
          pkgManager,
          installManifests,
        }: {pkgManager: PkgManager; installManifests: InstallManifest[]},
      ): InstallerMachineInstallEvent => {
        installManifests = appendAdditionalDeps(
          pkgManager,
          add,
          installManifests,
        );
        return {
          type: 'INSTALL',
          pkgManager,
          installManifests,
          workspaceInfo: MachineUtil.asWorkspacesInfo(installManifests),
        };
      },
    ),
  },
}).createMachine({
  id: 'ControlMachine',
  context: ({
    input: {fileManager, defaultExecutor, systemExecutor, ...rest},
  }): CtrlMachineContext => {
    defaultExecutor ??= rest.pluginRegistry.getExecutor(DEFAULT_EXECUTOR_ID);
    systemExecutor ??= rest.pluginRegistry.getExecutor(SYSTEM_EXECUTOR_ID);
    fileManager ??= FileManager.create();
    return {
      defaultExecutor,
      systemExecutor,
      fileManager,
      ...rest,
      shouldLint: false,
      pkgManagers: [],
      runnerMachineRefs: {},
      reporterMachineRefs: {},
      reporters: [],
      rules: [],
      scripts: [],
      scriptManifestMap: new WeakMap(),
      lintManifestMap: new WeakMap(),
      installManifestMap: new WeakMap(),
      totalChecks: 0,
      linterMachineRefs: {},
      shouldHalt: false,
      startTime: performance.now(),
      workspaceInfo: [],
    };
  },
  initial: 'loading',
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
              MachineUtil.assertActorOutputNotOk(output);
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
              MachineUtil.assertActorOutputNotOk(output);
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
              target: '#ControlMachine.done',
            },
          },
        },
        loadingPlugins: {
          description:
            'Spawns a PluginLoaderMachine, which provides reified components',
          entry: [
            log('loading plugin components...'),

            assign({
              pluginMachineLoaderRef: ({
                self,
                spawn,
                context: {
                  pluginRegistry,
                  smokerOptions,
                  fileManager,
                  systemExecutor,
                  defaultExecutor,
                  workspaceInfo,
                },
              }) => {
                const input: PluginLoaderMachineInput = {
                  pluginRegistry,
                  smokerOptions,
                  fileManager,
                  systemExecutor,
                  defaultExecutor,
                  parentRef: self,
                  workspaceInfo,
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
              target: '#ControlMachine.setup',
            },
          },
        },
      },
    },

    setup: {
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
              }): EventData<typeof SmokerEvent.PackOk> => {
                return {
                  uniquePkgs: MachineUtil.uniquePkgNames(manifests),
                  type: SmokerEvent.PackOk,
                  pkgManagers: map(context.pkgManagers, 'staticSpec'),
                  manifests,
                  totalPkgs: manifests.length,
                  workspaceInfo: context.workspaceInfo,
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
                    workspace: workspaces,
                  },
                  workspaceInfo,
                },
                event: {error},
              }): EventData<typeof SmokerEvent.PackFailed> => {
                return {
                  error,
                  type: SmokerEvent.PackFailed,
                  packOptions: {
                    cwd,
                    allWorkspaces,
                    // includeWorkspaceRoot,
                    workspaces,
                  },
                  pkgManagers: map(pkgManagers, 'staticSpec'),
                  workspaceInfo,
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
                MachineUtil.assertActorOutputOk(output);
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
                MachineUtil.assertActorOutputNotOk(output);
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
                context: {pkgManagers, installManifestMap},
              }): EventData<typeof SmokerEvent.InstallOk> => {
                return {
                  type: SmokerEvent.InstallOk,
                  ...buildInstallEventData(pkgManagers, installManifestMap),
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
                context: {pkgManagers, installManifestMap},
                event: {error},
              }): EventData<typeof SmokerEvent.InstallFailed> => {
                return {
                  error,
                  type: SmokerEvent.InstallFailed,
                  ...buildInstallEventData(pkgManagers, installManifestMap),
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
                MachineUtil.assertActorOutputOk(output);
                return {
                  type: 'INSTALL_OK',
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
                MachineUtil.assertActorOutputNotOk(output);
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
                    workspace: workspaces,
                  },
                  workspaceInfo,
                  pkgManagers,
                },
              }): EventData<typeof SmokerEvent.PackBegin> => ({
                type: SmokerEvent.PackBegin,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  // includeWorkspaceRoot,
                  workspaces,
                },
                pkgManagers: map(pkgManagers, 'staticSpec'),
                workspaceInfo,
              }),
            },
          ],
        },
        INSTALL_BEGIN: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers, installManifestMap},
              }): EventData<typeof SmokerEvent.InstallBegin> => ({
                type: SmokerEvent.InstallBegin,
                ...buildInstallEventData(pkgManagers, installManifestMap),
              }),
            },
          ],
        },
        PKG_PACK_BEGIN: {
          actions: [
            {
              type: 'report',
              params: ({
                event,
              }): EventData<typeof SmokerEvent.PkgPackBegin> => ({
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
              params: ({event}): EventData<typeof SmokerEvent.PkgPackOk> => ({
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
                event,
              }): EventData<typeof SmokerEvent.PkgPackFailed> => ({
                ...event,
                type: SmokerEvent.PkgPackFailed,
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
                    workspace: workspaces,
                  },
                  workspaceInfo,
                },
                event: {index, pkgManager},
              }): EventData<typeof SmokerEvent.PkgManagerPackBegin> => ({
                type: SmokerEvent.PkgManagerPackBegin,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
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
        PKG_MANAGER_INSTALL_BEGIN: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers},
                event: {index, pkgManager, installManifests},
              }): EventData<typeof SmokerEvent.PkgManagerInstallBegin> => ({
                type: SmokerEvent.PkgManagerInstallBegin,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                manifests: installManifests,
                totalPkgManagers: pkgManagers.length,
                workspaceInfo: MachineUtil.asWorkspacesInfo(installManifests),
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
                    workspace: workspaces,
                  },
                },
                event: {index, pkgManager, installManifests, workspaceInfo},
              }): EventData<typeof SmokerEvent.PkgManagerPackOk> => ({
                type: SmokerEvent.PkgManagerPackOk,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
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
            {
              type: 'assignInstallManifests',
              params: ({event: {pkgManager, installManifests}}) => ({
                pkgManager,
                installManifests,
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
                    workspace: workspaces,
                  },
                },
                event: {index, pkgManager, error, workspaceInfo},
              }): EventData<typeof SmokerEvent.PkgManagerPackFailed> => ({
                type: SmokerEvent.PkgManagerPackFailed,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
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
          target: '#ControlMachine.done',
        },
        PKG_MANAGER_INSTALL_OK: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagers},
                event: {index, pkgManager, installManifests},
              }): EventData<typeof SmokerEvent.PkgManagerInstallOk> => ({
                type: SmokerEvent.PkgManagerInstallOk,
                manifests: installManifests,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                totalPkgManagers: pkgManagers.length,
                workspaceInfo: MachineUtil.asWorkspacesInfo(installManifests),
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
              }): EventData<typeof SmokerEvent.PkgManagerInstallFailed> => ({
                type: SmokerEvent.PkgManagerInstallFailed,
                manifests: installManifests,
                currentPkgManager: index,
                pkgManager: pkgManager.staticSpec,
                error,
                totalPkgManagers: pkgManagers.length,
                workspaceInfo: MachineUtil.asWorkspacesInfo(installManifests),
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
                context: {pkgManagers, scripts, scriptManifestMap},
              }): EventData<typeof SmokerEvent.RunScriptsBegin> => {
                let pkgNames = new Set<string>();
                const manifests: Record<string, RunScriptManifest[]> =
                  Object.fromEntries(
                    pkgManagers.map((pkgManager) => {
                      const manifests = scriptManifestMap.get(pkgManager);
                      assert.ok(manifests);
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
                  }): EventData<typeof SmokerEvent.RunScriptBegin> => ({
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
                  }): EventData<typeof SmokerEvent.RunScriptFailed> => {
                    assert.ok(result.error);
                    return {
                      type: SmokerEvent.RunScriptFailed,
                      totalUniqueScripts: context.scripts.length,
                      currentScript: scriptIndex * pkgManagerIndex,
                      pkgManager: pkgManager.staticSpec,
                      ...runScriptManifest,
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
                    event: {
                      runScriptManifest,
                      pkgManager,
                      scriptIndex,
                      pkgManagerIndex,
                    },
                  }): EventData<typeof SmokerEvent.RunScriptSkipped> => ({
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
                    }): EventData<typeof SmokerEvent.RunScriptOk> => {
                      assert.ok(result.rawResult);
                      return {
                        type: SmokerEvent.RunScriptOk,
                        totalUniqueScripts: context.scripts.length,
                        currentScript: scriptIndex * pkgManagerIndex,
                        pkgManager: pkgManager.staticSpec,
                        ...runScriptManifest,
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
            PKG_MANAGER_RUN_SCRIPTS_BEGIN: {
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {pkgManagers, scripts},
                    event: {pkgManager, manifests, currentPkgManager},
                  }): EventData<
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
                      workspaceInfo: MachineUtil.asWorkspacesInfo(manifests),
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
                  }): EventData<
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
                      workspaceInfo: MachineUtil.asWorkspacesInfo(manifests),
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
                      scriptManifestMap: runScriptManifests,
                      scripts,
                    },
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

                    let pkgNames = new Set<string>();
                    const manifests: Record<string, RunScriptManifest[]> =
                      Object.fromEntries(
                        pkgManagers.map((pkgManager) => {
                          const manifests = runScriptManifests.get(pkgManager);
                          assert.ok(
                            manifests,
                            'expected a run script manifest',
                          );
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
              }): EventData<typeof SmokerEvent.LintBegin> => ({
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
                      MachineUtil.assertActorOutputOk(output);
                      return output.lintResult;
                    },
                  },
                  {
                    type: 'report',
                    params: ({
                      context: {pkgManagers, rules, totalChecks},
                      event: {output},
                    }): EventData<
                      | typeof SmokerEvent.PkgManagerLintOk
                      | typeof SmokerEvent.PkgManagerLintFailed
                    > => {
                      MachineUtil.assertActorOutputOk(output);
                      const {
                        pkgManager,
                        pkgManagerIndex,
                        lintResult: {passed, issues},
                        didFail,
                        workspaceInfo,
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
                        workspaceInfo,
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
                // log(
                //   ({event}) => `rule begin: ${event.rule} from ${event.sender}`,
                // ),
                {
                  type: 'report',
                  params: ({
                    context: {
                      rules: {length: totalRules},
                    },
                    event,
                  }): EventData<typeof SmokerEvent.RuleBegin> => {
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
                  }): EventData<typeof SmokerEvent.RuleFailed> => {
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
                  }): EventData<typeof SmokerEvent.RuleOk> => {
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
                  }): EventData<typeof SmokerEvent.PkgManagerLintBegin> => ({
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
                  }): EventData<
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
          entry: [
            log(({context: {startTime}}) => {
              const sec = ((performance.now() - startTime) / 1000).toFixed(2);
              return `complete (with error) in ${sec}s`;
            }),
          ],
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
      onDone: {
        target: 'stopped',
      },
    },
    stopped: {
      entry: [log('STOP')],
      type: 'final',
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
