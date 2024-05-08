import {
  DEFAULT_EXECUTOR_ID,
  PACKAGE_JSON,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {fromUnknownError} from '#error';
import {SmokerEvent, type EventData} from '#event';
import {PkgManagerMachine} from '#machine/pkg-manager';
import {
  LoadableComponents,
  ReifierMachine,
  type PkgManagerInitPayload,
  type ReifierMachineOutputOk,
  type ReporterInitPayload,
  type RuleInitPayload,
} from '#machine/reifier';
import {
  ReporterMachine,
  type ReporterMachineInput,
  type ReporterMachineOutput,
} from '#machine/reporter';
import * as MachineUtil from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PkgManagerSpec} from '#pkg-manager';
import {type PluginRegistry} from '#plugin';
import {
  WorkspacesConfigSchema,
  type Executor,
  type InstallManifest,
  type LintResult,
  type RunScriptManifest,
  type RunScriptResult,
  type SomeReporterDef,
  type SomeRule,
  type WorkspaceInfo,
} from '#schema';
import {FileManager} from '#util/filemanager';
import {glob} from 'glob';
import {isEmpty, map, partition} from 'lodash';
import {minimatch} from 'minimatch';
import assert from 'node:assert';
import path from 'node:path';
import {type PackageJson} from 'type-fest';
import {
  and,
  assign,
  enqueueActions,
  fromPromise,
  log,
  not,
  setup,
  type ActorRefFrom,
} from 'xstate';
import type * as Event from './control-machine-events';
import {buildInstallEventData} from './control-machine-util';

export type CtrlMachineOutput = CtrlOutputOk | CtrlOutputError;

export type CtrlOutputError = MachineUtil.ActorOutputError;

export type CtrlOutputOk = MachineUtil.ActorOutputOk<{
  lintResults?: LintResult[];
  runScriptResults?: RunScriptResult[];
}>;

export interface CtrlMachineContext extends CtrlMachineInput {
  defaultExecutor: Executor;
  error?: Error;
  fileManager: FileManager;
  installManifestMap: WeakMap<PkgManagerSpec, InstallManifest[]>;
  lintPlan: number;
  lintResults?: LintResult[];
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  pkgManagerMachineRefs?: Record<
    string,
    ActorRefFrom<typeof PkgManagerMachine>
  >;
  reifierMachineRefs: Record<string, ActorRefFrom<typeof ReifierMachine>>;
  reporterDefs: SomeReporterDef[];
  reporterInitPayloads: ReporterInitPayload[];
  reporterMachineRefs: Record<string, ActorRefFrom<typeof ReporterMachine>>;
  ruleInitPayloads: RuleInitPayload[];
  rules: SomeRule[];
  runScriptResults?: RunScriptResult[];
  scriptManifestMap: WeakMap<PkgManagerSpec, RunScriptManifest[]>;
  scripts: string[];
  shouldHalt: boolean;
  shouldLint: boolean;
  smokerPkgJson?: PackageJson;
  startTime: number;
  systemExecutor: Executor;
  totalChecks: number;
  workspaceInfo: WorkspaceInfo[];
}

export interface CtrlMachineInput {
  defaultExecutor?: Executor;
  fileManager?: FileManager;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  systemExecutor?: Executor;
}

export interface QueryWorkspacesInput {
  all: boolean;
  cwd: string;
  fileManager: FileManager;
  workspace: string[];
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
    readSmokerPkgJson: fromPromise<PackageJson, FileManager>(
      async ({input: fileManager}) => fileManager.readSmokerPkgJson(),
    ),
    queryWorkspaces,
    ReporterMachine,
    PkgManagerMachine,
    ReifierMachine,
  },
  guards: {
    /**
     * If `true`, then the machine has rules to lint against.
     */
    hasRules: ({context: {rules}}) => !isEmpty(rules),

    /**
     * If `true`, then the machine has performed a lint operation.
     */
    didLint: ({context: {lintPlan, lintResults = []}}) =>
      lintPlan > 0 && lintResults.length === lintPlan,

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

    hasNoPkgManagerMachineRefs: ({context: {pkgManagerMachineRefs}}) =>
      pkgManagerMachineRefs !== undefined && isEmpty(pkgManagerMachineRefs),

    // /**
    //  * If `true`, all workspaces have been packed
    //  */
    // isPackingComplete: ({context: {packerMachineRef}}) => !packerMachineRef,

    // /**
    //  * If `true`, all packed workspaces have been installed from tarballs
    //  */
    // isInstallingComplete: ({context: {installerMachineRef}}) =>
    //   !installerMachineRef,

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
    /**
     * Spawns a {@link ReifierMachine} for each plugin
     */
    spawnReifiers: assign({
      reifierMachineRefs: ({
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
            const id = `ReifierMachine.${MachineUtil.makeId()}`;
            const actor = spawn('ReifierMachine', {
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
     * Stops a given {@link ReifierMachine}
     */
    stopReifier: enqueueActions(
      ({enqueue, context: {reifierMachineRefs}}, id: string) => {
        enqueue.stopChild(id);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = reifierMachineRefs;
        enqueue.assign({
          reifierMachineRefs: rest,
        });
      },
    ),
    // assignLintResult: assign({
    //   lintResult: (
    //     {context: {lintResult = {passed: [], issues: []}}},
    //     newLintResult: LintResult,
    //   ) => {
    //     return {
    //       passed: [...lintResult.passed, ...newLintResult.passed],
    //       issues: [...lintResult.issues, ...newLintResult.issues],
    //     };
    //   },
    // }),
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

    // assignTotalChecks: assign({
    //   totalChecks: ({
    //     context: {pkgManagerInitPayloads, rules, lintManifestMap},
    //   }) => {
    //     return (
    //       rules.length *
    //       sumBy(
    //         pkgManagerInitPayloads,
    //         ({spec}) => lintManifestMap.get(spec)?.length ?? 0,
    //       )
    //     );
    //   },
    // }),

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
          smokerOptions: {all, workspace, rules, script: scripts},
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
                useWorkspaces,
                index: index + 1,
                signal,
                plugin,
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
        {reporterInitPayloads}: ReifierMachineOutputOk,
      ) => [...context.reporterInitPayloads, ...reporterInitPayloads],
      pkgManagerInitPayloads: (
        {context},
        {pkgManagerInitPayloads}: ReifierMachineOutputOk,
      ) => [...context.pkgManagerInitPayloads, ...pkgManagerInitPayloads],
      ruleInitPayloads: (
        {context},
        {ruleInitPayloads}: ReifierMachineOutputOk,
      ) => [...context.ruleInitPayloads, ...ruleInitPayloads],
    }),
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
      reifierMachineRefs: {},
      reporterMachineRefs: {},
      reporterDefs: [],
      rules: [],
      scripts: [],
      scriptManifestMap: new WeakMap(),
      installManifestMap: new WeakMap(),
      totalChecks: 0,
      shouldHalt: false,
      startTime: performance.now(),
      workspaceInfo: [],
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
      lintPlan: 0,
    };
  },
  initial: 'loading',
  entry: [log('starting control machine')],
  exit: [log('stopping control machine')],
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

    'xstate.done.actor.PkgManagerMachine.*': {
      actions: [
        {
          type: 'stopPkgManagerMachine',
          params: ({event: {output}}) => output.id,
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
          entry: [log('loading plugin components...'), {type: 'spawnReifiers'}],
          on: {
            'xstate.done.actor.ReifierMachine.*': [
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
                target: '#ControlMachine.done.errored',
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
              target: '#ControlMachine.done',
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
        {
          type: 'report',
          params: ({
            context: {pkgManagerInitPayloads, workspaceInfo, smokerOptions},
          }): EventData<typeof SmokerEvent.PackBegin> => ({
            type: SmokerEvent.PackBegin,

            packOptions: {
              cwd: smokerOptions.cwd,
              allWorkspaces: smokerOptions.all,
              workspaces: smokerOptions.workspace,
            },

            pkgManagers: pkgManagerInitPayloads.map(({spec}) => spec.toJSON()),
            workspaceInfo,
          }),
        },
        // enqueueActions(
        //   ({enqueue, context: {pkgManagerMachineRefs, workspaceInfo}}) => {
        //     assert.ok(pkgManagerMachineRefs);
        //     Object.values(pkgManagerMachineRefs).forEach((ref) => {
        //       for (const workspace of workspaceInfo) {
        //         enqueue.sendTo(ref, {
        //           type: 'PACK',
        //           workspace,
        //         });
        //       }
        //     });
        //   },
        // ),
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
                  pkgManagers: context.pkgManagerInitPayloads.map(({spec}) =>
                    spec.toJSON(),
                  ),
                  manifests,
                  totalPkgs: manifests.length,
                  workspaceInfo: context.workspaceInfo,
                };
              },
            },
          ],
        },
        PACK_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    workspace: workspaces,
                  },
                  pkgManagerInitPayloads,
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
                  pkgManagers: pkgManagerInitPayloads.map(({spec}) =>
                    spec.toJSON(),
                  ),
                  workspaceInfo,
                };
              },
            },
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
            // {
            //   type: 'stopPackerMachine',
            // },
          ],
          target: '#ControlMachine.done',
        },
        INSTALL_OK: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {installManifestMap, pkgManagerInitPayloads},
              }): EventData<typeof SmokerEvent.InstallOk> => {
                return {
                  type: SmokerEvent.InstallOk,
                  ...buildInstallEventData(
                    pkgManagerInitPayloads,
                    installManifestMap,
                  ),
                };
              },
            },
            // {
            //   type: 'stopInstallerMachine',
            // },
          ],
        },
        INSTALL_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagerInitPayloads, installManifestMap},
                event: {error},
              }): EventData<typeof SmokerEvent.InstallFailed> => {
                return {
                  error,
                  type: SmokerEvent.InstallFailed,
                  ...buildInstallEventData(
                    pkgManagerInitPayloads,
                    installManifestMap,
                  ),
                };
              },
            },
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
            // {
            //   type: 'stopInstallerMachine',
            // },
          ],
          target: '#ControlMachine.done',
        },
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
                  pkgManagerInitPayloads,
                },
              }): EventData<typeof SmokerEvent.PackBegin> => ({
                type: SmokerEvent.PackBegin,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  // includeWorkspaceRoot,
                  workspaces,
                },
                pkgManagers: map(pkgManagerInitPayloads, 'staticSpec'),
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
                context: {pkgManagerInitPayloads, installManifestMap},
              }): EventData<typeof SmokerEvent.InstallBegin> => ({
                type: SmokerEvent.InstallBegin,
                ...buildInstallEventData(
                  pkgManagerInitPayloads,
                  installManifestMap,
                ),
              }),
            },
          ],
        },
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
                  pkgManagerInitPayloads,
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    workspace: workspaces,
                  },
                  workspaceInfo,
                },
                event: {pkgManager},
              }): EventData<typeof SmokerEvent.PkgManagerPackBegin> => ({
                type: SmokerEvent.PkgManagerPackBegin,
                pkgManager,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  // includeWorkspaceRoot,
                  workspaces,
                },
                totalPkgManagers: pkgManagerInitPayloads.length,
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
                context: {pkgManagerInitPayloads},
                event: {pkgManager, installManifests},
              }): EventData<typeof SmokerEvent.PkgManagerInstallBegin> => ({
                type: SmokerEvent.PkgManagerInstallBegin,
                pkgManager,
                manifests: installManifests,
                totalPkgs: installManifests.length, // TODO is this right?
                totalPkgManagers: pkgManagerInitPayloads.length,
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
                  pkgManagerInitPayloads,
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
                totalPkgManagers: pkgManagerInitPayloads.length,
                workspaceInfo,
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
                  pkgManagerInitPayloads,
                  smokerOptions: {
                    cwd,
                    all: allWorkspaces,
                    workspace: workspaces,
                  },
                },
                event: {pkgManager, error, workspaceInfo},
              }): EventData<typeof SmokerEvent.PkgManagerPackFailed> => ({
                type: SmokerEvent.PkgManagerPackFailed,
                pkgManager,
                packOptions: {
                  cwd,
                  allWorkspaces,
                  // includeWorkspaceRoot,
                  workspaces,
                },
                error,
                totalPkgManagers: pkgManagerInitPayloads.length,
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
                context: {pkgManagerInitPayloads},
                event: {pkgManager, installManifests},
              }): EventData<typeof SmokerEvent.PkgManagerInstallOk> => ({
                type: SmokerEvent.PkgManagerInstallOk,
                manifests: installManifests,
                pkgManager,
                totalPkgs: installManifests.length,
                totalPkgManagers: pkgManagerInitPayloads.length,
              }),
            },
          ],
          //   enqueueActions(({enqueue, context: {pkgManagerMachineRefs}, event: {installManifests, sender}}) => {
          //     const ref = pkgManagerMachineRefs[sender];
          //     assert.ok(ref);

          //     for (const manifest of installManifests) {
          //     }

          //     const lintManifests = installManifests.filter(({isAdditional, installPath}) => Boolean(installPath && !isAdditional))
          //     .map(({installPath, pkgName, localPath}) => {
          //       if (!localPath) {
          //         throw new TypeError('expected localPath');
          //       }

          //       return {
          //         installPath,
          //         pkgName,
          //         localPath,
          //       } as LintManifest;
          //     })

          //   })
          // ],
        },
        PKG_MANAGER_INSTALL_FAILED: {
          actions: [
            {
              type: 'report',
              params: ({
                context: {pkgManagerInitPayloads},
                event: {pkgManager, installManifests, error},
              }): EventData<typeof SmokerEvent.PkgManagerInstallFailed> => ({
                type: SmokerEvent.PkgManagerInstallFailed,
                manifests: installManifests,
                pkgManager,
                error,
                totalPkgs: installManifests.length,
                totalPkgManagers: pkgManagerInitPayloads.length,
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
          // we halt when 1. the shouldHalt flag is true, and 2. when all pkg managers have shut themselves down.
          guard: and(['shouldHalt', 'hasNoPkgManagerMachineRefs']),
          target: '#ControlMachine.done',
        },
      ],
    },
    // TODO fix this; the pkg manager machine will do it
    runningScripts: {
      initial: 'working',
      states: {
        working: {
          entry: [
            log('running scripts...'),
            // {
            //   type: 'spawnRunnerMachines',
            // },
            {
              type: 'report',
              params: ({
                context: {pkgManagerInitPayloads, scripts, scriptManifestMap},
              }): EventData<typeof SmokerEvent.RunScriptsBegin> => {
                let pkgNames = new Set<string>();
                const manifests: Record<string, RunScriptManifest[]> =
                  Object.fromEntries(
                    pkgManagerInitPayloads.map(({spec: pkgManager}) => {
                      const manifests = scriptManifestMap.get(pkgManager);
                      assert.ok(manifests);
                      pkgNames = new Set([
                        ...pkgNames,
                        ...map(manifests, 'pkgName'),
                      ]);
                      return [
                        `${pkgManager.pkgManager}@${pkgManager.version}${
                          pkgManager.isSystem ? 'system' : ''
                        }`,
                        manifests,
                      ];
                    }),
                  );

                return {
                  type: SmokerEvent.RunScriptsBegin,
                  manifests,
                  totalUniqueScripts: scripts.length,
                  totalUniquePkgs: pkgNames.size,
                  totalPkgManagers: pkgManagerInitPayloads.length,
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
            PKG_MANAGER_RUN_SCRIPTS_BEGIN: {
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {pkgManagerInitPayloads, scripts},
                    event: {pkgManager, manifests},
                  }): EventData<
                    typeof SmokerEvent.PkgManagerRunScriptsBegin
                  > => {
                    return {
                      type: SmokerEvent.PkgManagerRunScriptsBegin,
                      pkgManager,
                      manifests,
                      totalPkgManagers: pkgManagerInitPayloads.length,
                      totalUniqueScripts: scripts.length,
                      totalUniquePkgs:
                        MachineUtil.uniquePkgNames(manifests).length,
                    };
                  },
                },
              ],
            },
          },
          always: [
            {
              guard: ({context}) => Boolean(context.runScriptResults),
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      runScriptResults,
                      pkgManagerInitPayloads,
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
                        pkgManagerInitPayloads.map(({spec: pkgManager}) => {
                          const manifests = runScriptManifests.get(pkgManager);
                          assert.ok(
                            manifests,
                            'expected a run script manifest',
                          );
                          pkgNames = new Set([
                            ...pkgNames,
                            ...map(manifests, 'pkgName'),
                          ]);
                          return [
                            `${pkgManager.pkgManager}@${pkgManager.version}${
                              pkgManager.isSystem ? 'system' : ''
                            }`,
                            manifests,
                          ];
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
                      totalPkgManagers: pkgManagerInitPayloads.length,
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
        target: '#ControlMachine.done',
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
              guard: 'hasError',
              target: '#ControlMachine.done.errored',
            },
            {
              guard: and(['notHasError', not('hasReporterRefs')]),
              target: '#ControlMachine.done.complete',
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
    context: {error, lintResults: lintResult, runScriptResults},
  }): CtrlMachineOutput => {
    return error
      ? {type: 'ERROR', error, id}
      : {type: 'OK', id, lintResults: lintResult, runScriptResults};
  },
});
