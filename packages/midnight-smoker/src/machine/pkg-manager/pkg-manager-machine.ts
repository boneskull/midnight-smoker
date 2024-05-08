import {type SomeSmokerError} from '#error';
import {
  type CtrlPkgInstallBeginEvent,
  type CtrlPkgInstallFailedEvent,
  type CtrlPkgInstallOkEvent,
  type CtrlPkgManagerInstallBeginEvent,
  type CtrlPkgManagerInstallFailedEvent,
  type CtrlPkgManagerInstallOkEvent,
  type CtrlPkgManagerLintBeginEvent,
  type CtrlPkgManagerLintFailedEvent,
  type CtrlPkgManagerLintOkEvent,
  type CtrlPkgManagerPackBeginEvent,
  type CtrlPkgManagerPackFailedEvent,
  type CtrlPkgManagerPackOkEvent,
  type CtrlPkgPackBeginEvent,
  type CtrlPkgPackFailedEvent,
  type CtrlPkgPackOkEvent,
  type CtrlRuleBeginEvent,
  type CtrlRuleFailedEvent,
  type CtrlRuleOkEvent,
} from '#machine/controller';
import {type ActorOutput} from '#machine/util';
import {
  InstallError,
  type PackError,
  type PackParseError,
  type PkgManagerSpec,
} from '#pkg-manager';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {
  type BaseNormalizedRuleOptionsRecord,
  type LintResultFailed,
  type LintResultOk,
  type RuleResult,
} from '#rule';
import {
  PkgManagerContextSchema,
  type Executor,
  type InstallManifest,
  type InstallResult,
  type LintManifest,
  type LintResult,
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerOpts,
  type RunScriptManifest,
  type RunScriptResult,
  type SomeRule,
  type WorkspaceInfo,
} from '#schema';
import {isSmokerError, type FileManager} from '#util';
import {isEmpty, keyBy, partition} from 'lodash';
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
  type AnyActorRef,
} from 'xstate';
import {
  check,
  createTempDir,
  install,
  pack,
  prepareLintItem,
  pruneTempDir,
  runScript,
  setupPkgManager,
  teardownPkgManager,
  type InstallInput,
} from './pkg-manager-machine-actors';
import {
  type CheckItem,
  type CheckOutput,
  type PkgManagerMachineEvents,
} from './pkg-manager-machine-events';

export type PkgManagerMachineOutput = ActorOutput;

export interface InstallItem {
  installManifest: InstallManifest;
}

/**
 * State names.
 *
 * These are _not_ unique; the same name may be used across multiple states
 * (e.g., `done`).
 */
const S = {
  Idle: 'idle',
  Startup: 'startup',
  ReadyingFilesystem: 'readyingFilesystem',
  CreatingContext: 'creatingContext',
  SetupLifecycle: 'setupLifecycle',
  Done: 'done',
  Working: 'working',
  Packing: 'packing',
  PackingPkgs: 'packingPkgs',
  Errored: 'errored',
  Installing: 'installing',
  InstallingPkgs: 'installingPkgs',
  InstallPkg: 'installPkg',
  InstalledPkg: 'installedPkg',
  Linting: 'linting',
  LintingPkgs: 'lintingPkgs',
  Shutdown: 'shutdown',
  CleanupFilesystem: 'cleanupFilesystem',
  TeardownLifecycle: 'teardownLifecycle',
} as const;

export interface PkgManagerMachineContext extends PkgManagerMachineInput {
  additionalDeps: string[];
  ctx?: PkgManagerContext;

  /**
   * The current install job. Installations run in serial
   */
  currentInstallJob?: InstallItem;
  error?: SomeSmokerError;
  installManifests?: InstallManifest[];
  installQueue?: InstallItem[];
  installResults?: InstallResult[];
  lintManifests?: LintManifest[];
  lintQueue?: CheckItem[];
  opts: PkgManagerOpts;
  packQueue?: WorkspaceInfo[];
  ruleResultMap: Map<string, Map<string, RuleResult[]>>;
  runScriptQueue?: RunScriptItem[];
  runScriptResults?: RunScriptResult[];
  shouldLint: boolean;
  shouldShutdown: boolean;
  tmpdir?: string;
}

export interface PkgManagerMachineInput {
  additionalDeps?: string[];
  def: PkgManagerDef;
  executor: Executor;
  fileManager: FileManager;
  index: number;
  opts?: PkgManagerOpts;
  parentRef: AnyActorRef;
  plugin: Readonly<PluginMetadata>;
  ruleConfigs: BaseNormalizedRuleOptionsRecord;
  rules: SomeRule[];
  scripts?: string[];
  shouldLint?: boolean;
  shouldShutdown?: boolean;
  signal: AbortSignal;
  spec: PkgManagerSpec;
  useWorkspaces: boolean;
  workspaceInfo: WorkspaceInfo[];
}

export interface RunScriptItem {
  runScriptManifest: RunScriptManifest;
  signal: AbortSignal;
}

export const PkgManagerMachine = setup({
  types: {
    input: {} as PkgManagerMachineInput,
    context: {} as PkgManagerMachineContext,
    events: {} as PkgManagerMachineEvents,
    output: {} as PkgManagerMachineOutput,
  },
  actors: {
    createTempDir,
    setupPkgManager,
    pruneTempDir,
    teardownPkgManager,
    pack,
    install,
    runScript,
    prepareLintItem,
    check,
  },
  actions: {
    sendRuleEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {spec}},
        {result, type, rule, ...output}: CheckOutput,
      ): CtrlRuleFailedEvent | CtrlRuleOkEvent => {
        if (type === 'OK') {
          return {
            ...output,
            result,
            pkgManager: spec.toJSON(),
            rule: rule.id,
            sender,
            type: 'RULE_OK',
          };
        }
        return {
          ...output,
          result,
          pkgManager: spec.toJSON(),
          rule: rule.id,
          sender,
          type: 'RULE_FAILED',
        };
      },
    ),
    appendLintManifest: assign({
      lintManifests: (
        {context: {lintManifests = []}},
        lintManifest: LintManifest,
      ) => [...lintManifests, lintManifest],
    }),
    prepareLintItem: enqueueActions(
      ({enqueue, context: {fileManager}}, lintManifest: LintManifest) => {
        enqueue.spawnChild('prepareLintItem', {
          id: `prepareLintItem.${lintManifest.installPath}`,
          input: {
            lintItem: {
              signal: new AbortController().signal,
              manifest: lintManifest,
            },
            fileManager,
          },
        });
      },
    ),
    createPkgManagerContext: assign({
      ctx: ({
        context: {spec, tmpdir, executor, workspaceInfo, useWorkspaces, opts},
      }) => {
        const ctx = PkgManagerContextSchema.parse({
          spec,
          tmpdir,
          executor,
          workspaceInfo,
          useWorkspaces,
          ...opts,
        });
        return ctx;
      },
    }),
    shutdown: assign({
      shouldShutdown: true,
    }),
    enqueueInstallItem: assign({
      installQueue: (
        {context: {installQueue = []}},
        {installManifest}: InstallItem,
      ) => [...installQueue, {installManifest}],
    }),
    enqueueRunScriptItem: assign({
      runScriptQueue: (
        {context: {runScriptQueue = []}},
        {runScriptManifest, signal}: RunScriptItem,
      ) => [...runScriptQueue, {runScriptManifest, signal}],
    }),
    enqueueLintItem: assign({
      lintQueue: ({context: {lintQueue = []}}, lintItem: CheckItem) => [
        ...lintQueue,
        lintItem,
      ],
    }),
    sendPkgManagerPackBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({self, context: {index, spec}}): CtrlPkgManagerPackBeginEvent => {
        return {
          sender: self.id,
          type: 'PKG_MANAGER_PACK_BEGIN',
          index,
          pkgManager: spec.toJSON(),
        };
      },
    ),
    sendPkgManagerPackEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id},
        context: {
          error,
          index: pkgManagerIndex,
          installManifests = [],
          workspaceInfo,
          spec,
        },
      }): CtrlPkgManagerPackOkEvent | CtrlPkgManagerPackFailedEvent => {
        const data = {
          index: pkgManagerIndex,

          workspaceInfo,
          pkgManager: spec.toJSON(),
          sender: id,
        };
        if (error) {
          return {
            type: 'PKG_MANAGER_PACK_FAILED',
            error: error as PackError | PackParseError,
            ...data,
          };
        }
        return {
          type: 'PKG_MANAGER_PACK_OK',
          installManifests,
          ...data,
        };
      },
    ),
    spawnPackActors: enqueueActions(
      ({enqueue, context: {signal, def, ctx, packQueue}}) => {
        assert.ok(packQueue);
        assert.ok(ctx);
        const queue = [...packQueue];
        while (queue.length) {
          const job = queue.shift();
          assert.ok(job);
          enqueue.spawnChild('pack', {
            id: `pack.${job.pkgName}`,
            input: {
              def,
              ctx: {
                ...ctx,
                ...job,
                signal,
              },
            },
          });
        }
        enqueue.assign({
          packQueue: [],
        });
      },
    ),
    sendPkgPackBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {spec, packQueue},
      }): CtrlPkgPackBeginEvent => {
        assert.ok(packQueue);
        const [job] = packQueue;
        return {
          sender,
          type: 'PKG_PACK_BEGIN',
          pkgManager: spec.toJSON(),
          workspace: job,
        };
      },
    ),
    sendPkgPackOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {spec}},
        installManifest: InstallManifest,
      ): CtrlPkgPackOkEvent => {
        assert.ok(installManifest.localPath);
        return {
          sender,
          type: 'PKG_PACK_OK',
          pkgManager: spec.toJSON(),
          workspace: <WorkspaceInfo>{
            localPath: installManifest.localPath,
            pkgName: installManifest.pkgName,
          },
          installManifest,
        };
      },
    ),
    assignInstallManifests: assign({
      installManifests: (
        {context: {installManifests = []}},
        {output: installManifest}: {output: InstallManifest},
      ) => [...installManifests, installManifest],
    }),
    assignTmpdir: assign({
      tmpdir: (_, tmpdir: string) => tmpdir,
    }),
    appendInstallResult: assign({
      installResults: (
        {context: {installResults = []}},
        installResult: InstallResult,
      ) => [...installResults, installResult],
    }),
    sendPkgInstallOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {spec}},
        {installManifest, rawResult}: InstallResult,
      ): CtrlPkgInstallOkEvent => {
        return {
          sender,
          rawResult,
          type: 'PKG_INSTALL_OK',
          installManifest,
          pkgManager: spec.toJSON(),
        };
      },
    ),
    sendPkgManagerLintBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({self: {id: sender}, context: {spec}}): CtrlPkgManagerLintBeginEvent => {
        return {
          type: 'PKG_MANAGER_LINT_BEGIN',
          pkgManager: spec.toJSON(),
          sender,
        };
      },
    ),
    sendPkgManagerLintEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {spec, error, ruleResultMap, lintManifests},
      }): CtrlPkgManagerLintOkEvent | CtrlPkgManagerLintFailedEvent => {
        let hasIssues = false;

        const manifestsByInstallPath = keyBy(lintManifests, 'installPath');

        // turn the ugly map into `LintResult`
        const lintResults: LintResult[] = [...ruleResultMap.entries()].map(
          ([installPath, resultMap]) => {
            const results = [...resultMap.values()].flat();
            const [okResults, failedResults] = partition(
              results,
              (r) => r.type === 'OK',
            );
            hasIssues = hasIssues || Boolean(failedResults.length);

            assert.ok(manifestsByInstallPath[installPath]);

            const retval = failedResults.length
              ? <LintResultFailed>{
                  ...manifestsByInstallPath[installPath],
                  type: 'FAILED',
                  results,
                }
              : <LintResultOk>{
                  ...manifestsByInstallPath[installPath],
                  type: 'OK',
                  results: okResults,
                };

            return retval;
          },
        );

        if (error || hasIssues) {
          return {
            type: 'PKG_MANAGER_LINT_FAILED',
            pkgManager: spec.toJSON(),
            sender,
            results: lintResults,
          };
        }

        return {
          type: 'PKG_MANAGER_LINT_OK',
          pkgManager: spec.toJSON(),
          results: lintResults,
          sender,
        };
      },
    ),
    enqueueAdditionalDeps: enqueueActions(
      ({enqueue, context: {installQueue = [], tmpdir, additionalDeps}}) => {
        assert.ok(tmpdir);
        for (const dep of additionalDeps) {
          enqueue.assign({
            installQueue: [
              ...installQueue,
              {
                installManifest: {
                  cwd: tmpdir,
                  pkgSpec: dep,
                  pkgName: dep,
                  isAdditional: true,
                },
              },
            ],
          });
        }
      },
    ),
    shouldLint: assign({
      shouldLint: true,
    }),
  },
  guards: {
    hasContext: ({context: {ctx}}) => Boolean(ctx),
    hasTempDir: ({context: {tmpdir}}) => Boolean(tmpdir),
    isBootstrapped: and(['hasContext', 'hasTempDir']),
    hasPackJobs: ({context: {packQueue}}) => !isEmpty(packQueue),
    hasInstallJobs: ({context: {installQueue}}) => !isEmpty(installQueue),
    hasRunScriptJobs: ({context: {runScriptQueue}}) => !isEmpty(runScriptQueue),
    hasLintJobs: ({context: {lintQueue}}) => !isEmpty(lintQueue),
    shouldShutdown: ({context: {shouldShutdown}}) => shouldShutdown,
    hasError: ({context: {error}}) => Boolean(error),
    hasWorkspaces: ({context: {workspaceInfo}}) => !isEmpty(workspaceInfo),
    hasInstallManifests: ({context: {installManifests}}) =>
      !isEmpty(installManifests),
    isInstallationComplete: and([
      'hasInstallManifests',
      not('hasInstallJobs'),
      'isPackingComplete',
      ({context: {installResults = [], installManifests = []}}) =>
        installResults.length === installManifests.length,
    ]),
    isPackingComplete: and([
      'hasWorkspaces',
      not('hasPackJobs'),
      ({context: {installManifests = [], workspaceInfo, additionalDeps}}) =>
        installManifests.length ===
        additionalDeps.length + workspaceInfo.length,
    ]),
    shouldLint: and(['hasLintJobs', ({context: {shouldLint}}) => shouldLint]),
    isLintableManifest: (
      {context: {shouldLint}},
      installManifest: InstallManifest,
    ) =>
      shouldLint &&
      Boolean(installManifest.localPath) &&
      Boolean(installManifest.installPath) &&
      !installManifest.isAdditional,
    didRunAllRulesForManifest: (
      {context: {ruleResultMap, rules}},
      manifest: LintManifest,
    ) => {
      return Boolean(
        ruleResultMap.get(manifest.installPath)?.size === rules.length,
      );
    },
    isLintingComplete: and([
      not('hasLintJobs'),
      ({
        context: {
          lintManifests = [],
          ruleResultMap,
          rules: {length: ruleCount},
        },
      }) => {
        if (isEmpty(lintManifests) || !ruleResultMap.size) {
          return false;
        }
        return lintManifests.every(
          (manifest) =>
            ruleResultMap.get(manifest.installPath)?.size === ruleCount,
        );
      },
    ]),
  },
}).createMachine({
  id: 'PkgManagerMachine',
  entry: [
    ({context: {spec, shouldLint}}) => {
      let msg = `PkgManagerMachine ${spec} starting up`;
      if (shouldLint) {
        msg += '; will lint';
      }
      return msg;
    },
  ],
  exit: [
    log(({context: {spec}}) => `PkgManagerMachine ${spec} exiting gracefully`),
  ],
  initial: S.Startup,
  context: ({
    input: {
      opts: {loose = false, verbose = false} = {},
      shouldLint = false,
      shouldShutdown = false,
      additionalDeps = [],
      workspaceInfo,
      ...input
    },
  }) => ({
    ...input,
    workspaceInfo,
    opts: {loose, verbose},
    packQueue: [...workspaceInfo],
    installQueue: [],
    runScriptQueue: [],
    lintQueue: [],
    additionalDeps,
    shouldShutdown,
    shouldLint,
    ruleResultMap: new Map(),
  }),
  always: [
    {
      guard: {type: 'hasError'},
      actions: [log(({context: {error}}) => `ERROR: ${error?.message}`)],
    },
  ],
  on: {
    HALT: {
      actions: [log('received HALT; will shutdown asap'), {type: 'shutdown'}],
    },
    LINT: {
      actions: [{type: 'shouldLint'}],
    },
  },
  states: {
    [S.Startup]: {
      initial: S.ReadyingFilesystem,
      states: {
        [S.ReadyingFilesystem]: {
          entry: [log('creating temp dir')],
          invoke: {
            src: 'createTempDir',
            input: ({context: {fileManager, spec}}) => ({spec, fileManager}),
            onDone: {
              actions: [
                {type: 'assignTmpdir', params: ({event: {output}}) => output},
              ],
              target: S.CreatingContext,
            },
          },
        },
        [S.CreatingContext]: {
          entry: [log('creating context'), {type: 'createPkgManagerContext'}],
          always: [
            {
              guard: {type: 'isBootstrapped'},
              target: S.SetupLifecycle,
            },
            {
              actions: [log('failed to bootstrap!?')],
            },
          ],
        },
        [S.SetupLifecycle]: {
          entry: [log('running setup lifecycle hook')],
          invoke: {
            src: 'setupPkgManager',
            input: ({context: {def, ctx}}) => {
              assert.ok(ctx);
              return {
                def,
                ctx,
              };
            },
            onDone: {
              target: S.Done,
            },
          },
        },
        [S.Done]: {
          type: 'final',
        },
      },
      onDone: {
        target: S.Working,
      },
    },
    [S.Working]: {
      type: 'parallel',
      // we can start installing additional deps as soon as we have a tmpdir
      entry: [{type: 'enqueueAdditionalDeps'}],
      states: {
        [S.Packing]: {
          description: 'Packs chosen workspaces in parallel',
          initial: S.Idle,

          states: {
            [S.Idle]: {
              always: [
                {
                  guard: {type: 'hasPackJobs'},
                  actions: [log('pack jobs available')],
                  target: S.PackingPkgs,
                },
              ],
            },
            [S.PackingPkgs]: {
              entry: [{type: 'sendPkgManagerPackBegin'}],
              exit: [{type: 'sendPkgManagerPackEnd'}],
              always: [
                {
                  guard: {type: 'hasError'},
                  target: S.Errored,
                },
                {
                  guard: {type: 'isPackingComplete'},
                  target: S.Done,
                },
                {
                  guard: {type: 'hasPackJobs'},
                  actions: [
                    {type: 'sendPkgPackBegin'},
                    {type: 'spawnPackActors'},
                  ],
                },
              ],
              on: {
                'xstate.done.actor.pack.*': {
                  actions: [
                    log('pack done'),
                    {
                      type: 'assignInstallManifests',
                      params: ({event}) => event,
                    },
                    {
                      type: 'sendPkgPackOk',
                      params: ({event: {output}}) => output,
                    },
                    {
                      type: 'enqueueInstallItem',
                      params: ({event: {output: installManifest}}) => ({
                        installManifest,
                      }),
                    },
                  ],
                },
                'xstate.error.actor.pack.*': {
                  actions: [
                    log('pack errored!'),
                    assign({
                      error: ({event: {error}}) => error,
                    }),
                    sendTo(
                      ({context: {parentRef}}) => parentRef,
                      ({
                        self: {id: sender},
                        context: {spec},
                        event: {error},
                      }): CtrlPkgPackFailedEvent => ({
                        sender,
                        workspace: error.context.workspace,
                        type: 'PKG_PACK_FAILED',
                        error,
                        pkgManager: spec.toJSON(),
                      }),
                    ),
                  ],
                },
              },
            },
            [S.Errored]: {
              entry: [log('packing errored')],
              type: 'final',
            },
            [S.Done]: {
              entry: [log('packing complete')],
              type: 'final',
            },
          },
        },
        [S.Installing]: {
          description: 'Installs in serial',
          entry: [log('ready to install')],
          initial: S.Idle,
          states: {
            [S.Idle]: {
              always: [
                {
                  guard: {type: 'hasInstallJobs'},
                  target: S.InstallingPkgs,
                },
              ],
            },
            [S.InstallingPkgs]: {
              entry: [
                sendTo(
                  ({context: {parentRef}}) => parentRef,
                  ({
                    self,
                    context: {index, spec, installManifests = []},
                  }): CtrlPkgManagerInstallBeginEvent => ({
                    installManifests,
                    sender: self.id,
                    type: 'PKG_MANAGER_INSTALL_BEGIN',
                    index,
                    pkgManager: spec.toJSON(),
                  }),
                ),
              ],
              exit: [
                sendTo(
                  ({context: {parentRef}}) => parentRef,
                  ({
                    self: {id: sender},
                    context: {
                      index: pkgManagerIndex,
                      installManifests = [],
                      spec,
                      error,
                    },
                  }):
                    | CtrlPkgManagerInstallOkEvent
                    | CtrlPkgManagerInstallFailedEvent =>
                    isSmokerError(InstallError, error)
                      ? {
                          installManifests,
                          type: 'PKG_MANAGER_INSTALL_FAILED',
                          index: pkgManagerIndex,
                          pkgManager: spec.toJSON(),
                          sender,
                          error,
                        }
                      : {
                          type: 'PKG_MANAGER_INSTALL_OK',
                          index: pkgManagerIndex,
                          installManifests,
                          pkgManager: spec.toJSON(),
                          sender,
                        },
                ),
              ],
              initial: S.InstallPkg,
              states: {
                [S.InstallPkg]: {
                  entry: [
                    enqueueActions(
                      ({
                        self: {id: sender},
                        context: {spec, parentRef, installQueue},
                        enqueue,
                      }) => {
                        assert.ok(installQueue);

                        const [job, ...newInstallQueue] = installQueue;

                        enqueue.assign({
                          currentInstallJob: job,
                          installQueue: newInstallQueue,
                        });

                        const {installManifest} = job;

                        const evt: CtrlPkgInstallBeginEvent = {
                          type: 'PKG_INSTALL_BEGIN',
                          installManifest,
                          pkgManager: spec.toJSON(),
                          sender,
                        };
                        enqueue.sendTo(parentRef, evt);
                      },
                    ),
                  ],
                  invoke: {
                    src: 'install',
                    input: ({
                      context: {def, ctx, signal, currentInstallJob},
                    }): InstallInput => {
                      assert.ok(currentInstallJob);
                      assert.ok(ctx);

                      return {def, ctx: {...ctx, ...currentInstallJob, signal}};
                    },
                    onDone: [
                      {
                        guard: {
                          type: 'isLintableManifest',
                          params: ({
                            event: {
                              output: {installManifest},
                            },
                          }) => installManifest,
                        },
                        actions: [
                          {
                            type: 'appendInstallResult',
                            params: ({event: {output}}) => output,
                          },
                          {
                            type: 'sendPkgInstallOk',
                            params: ({event: {output}}) => output,
                          },
                          {
                            type: 'appendLintManifest',
                            params: ({
                              event: {
                                output: {
                                  installManifest: {
                                    pkgName,
                                    installPath,
                                    localPath,
                                  },
                                },
                              },
                            }) => {
                              assert.ok(installPath);
                              assert.ok(localPath);
                              return {pkgName, installPath, localPath};
                            },
                          },
                          // TODO fix this weirdness.
                          {
                            type: 'prepareLintItem',
                            params: ({
                              event: {
                                output: {
                                  installManifest: {
                                    installPath,
                                    localPath,
                                    pkgName,
                                  },
                                },
                              },
                            }) => {
                              assert.ok(installPath);
                              assert.ok(localPath);
                              return {pkgName, installPath, localPath};
                            },
                          },
                        ],
                        target: S.InstalledPkg,
                      },
                      {
                        actions: [
                          {
                            type: 'appendInstallResult',
                            params: ({event: {output}}) => output,
                          },
                          {
                            type: 'sendPkgInstallOk',
                            params: ({event: {output}}) => output,
                          },
                        ],
                        target: S.InstalledPkg,
                      },
                    ],
                    onError: {
                      actions: [
                        log('install errored!'),
                        assign({
                          error: ({event: {error}}) => error as InstallError,
                        }),
                        sendTo(
                          ({context: {parentRef}}) => parentRef,
                          ({
                            self: {id: sender},
                            context: {spec, currentInstallJob},
                            event: {error},
                          }): CtrlPkgInstallFailedEvent => {
                            assert.ok(currentInstallJob);
                            return {
                              installManifest:
                                currentInstallJob.installManifest,
                              sender,
                              type: 'PKG_INSTALL_FAILED',
                              error: error as InstallError,
                              pkgManager: spec.toJSON(),
                            };
                          },
                        ),
                      ],
                    },
                  },
                },
                [S.InstalledPkg]: {
                  always: [
                    {
                      guard: {type: 'hasError'},
                      target: S.Errored,
                    },
                    {
                      guard: {type: 'hasInstallJobs'},
                      target: S.InstallPkg,
                    },
                    {
                      guard: {type: 'isInstallationComplete'},
                      target: S.Done,
                    },
                  ],
                },
                [S.Done]: {
                  type: 'final',
                },
                [S.Errored]: {
                  type: 'final',
                },
              },
              onDone: {
                target: S.Done,
              },
            },
            [S.Done]: {
              entry: [
                log('installation complete'),
                // we no longer need this information
                assign({
                  installResults: undefined,
                }),
              ],
              type: 'final',
            },
            [S.Errored]: {
              entry: log('install errored'),
              type: 'final',
            },
          },
        },
        // scriptRunning: {},
        [S.Linting]: {
          initial: S.Idle,
          on: {
            'xstate.done.actor.prepareLintItem.*': {
              actions: [
                {
                  type: 'enqueueLintItem',
                  params: ({event: {output}}) => output,
                },
              ],
            },
            'xstate.done.actor.check.*': {
              actions: [
                log(
                  ({
                    event: {
                      output: {
                        rule: {id},
                        manifest: {pkgName},
                      },
                    },
                  }) => `ran rule ${id} on ${pkgName}`,
                ),
                assign({
                  ruleResultMap: ({
                    context: {ruleResultMap},
                    event: {output},
                  }) => {
                    // ☠️
                    const ruleResultsForManifestMap =
                      ruleResultMap.get(output.manifest.installPath) ??
                      new Map<string, RuleResult[]>();
                    const ruleResultsForRuleIdMap =
                      ruleResultsForManifestMap.get(output.rule.id) ?? [];
                    if (output.type === 'OK') {
                      ruleResultsForRuleIdMap.push(output.result);
                    } else {
                      ruleResultsForRuleIdMap.push(...output.result);
                    }
                    ruleResultsForManifestMap.set(
                      output.rule.id,
                      ruleResultsForRuleIdMap,
                    );
                    ruleResultMap.set(
                      output.manifest.installPath,
                      ruleResultsForManifestMap,
                    );
                    return new Map(ruleResultMap);
                  },
                }),
                raise(({event: {output}}) => ({type: 'RULE_END', output})),
              ],
            },
            'xstate.error.actor.check.*': {
              actions: [
                assign({
                  error: ({event: {error}}) => error,
                }),
              ],
            },
          },
          states: {
            [S.Idle]: {
              always: {
                actions: {type: 'shouldLint'},
                target: S.LintingPkgs,
              },
            },
            // TODO error handling
            [S.LintingPkgs]: {
              entry: [{type: 'sendPkgManagerLintBegin'}],
              always: [
                {
                  guard: {type: 'hasLintJobs'},
                  actions: [
                    enqueueActions(
                      ({
                        self: {id: sender},
                        enqueue,
                        context: {
                          spec,
                          ruleConfigs,
                          lintQueue,
                          rules,
                          parentRef,
                        },
                      }) => {
                        assert.ok(lintQueue);
                        const queue = [...lintQueue];
                        while (queue.length) {
                          const job = queue.shift();
                          assert.ok(job);
                          for (const rule of rules) {
                            const config = ruleConfigs[rule.id];
                            const evt: CtrlRuleBeginEvent = {
                              sender,
                              type: 'RULE_BEGIN',
                              manifest: job.manifest,
                              rule: rule.id,
                              config,
                              pkgManager: spec.toJSON(),
                            };
                            enqueue.sendTo(parentRef, evt);
                            enqueue.spawnChild('check', {
                              id: `check.${job.manifest.pkgName}-${rule.id}`,
                              input: {...job, config, pkgManager: spec, rule},
                            });
                          }
                        }
                      },
                    ),
                    assign({lintQueue: []}),
                  ],
                },
              ],
              exit: [{type: 'sendPkgManagerLintEnd'}],
              on: {
                RULE_END: [
                  {
                    guard: {type: 'isLintingComplete'},
                    target: S.Done,
                    actions: [
                      log('got rule end'),
                      {type: 'sendRuleEnd', params: ({event}) => event.output},
                    ],
                  },
                  {
                    actions: [
                      log(({context}) => {
                        return `got rule end`;
                      }),
                      {type: 'sendRuleEnd', params: ({event}) => event.output},
                    ],
                  },
                ],
              },
            },
            [S.Done]: {
              entry: log('linting complete'),
              type: 'final',
            },
          },
        },
      },
      onDone: [
        {
          guard: {type: 'shouldShutdown'},
          target: S.Shutdown,
          actions: [log('shutting down')],
        },
      ],
    },
    [S.Shutdown]: {
      initial: S.CleanupFilesystem,
      states: {
        [S.CleanupFilesystem]: {
          invoke: {
            src: 'pruneTempDir',
            input: ({context: {tmpdir, fileManager}}) => {
              assert.ok(tmpdir);
              return {
                tmpdir,
                fileManager,
              };
            },
            onDone: {
              target: S.TeardownLifecycle,
            },
          },
        },
        [S.TeardownLifecycle]: {
          invoke: {
            src: 'teardownPkgManager',
            input: ({context: {def, ctx}}) => {
              assert.ok(ctx);
              return {
                def,
                ctx,
              };
            },
            onDone: {
              target: S.Done,
            },
          },
        },
        [S.Done]: {
          type: 'final',
        },
      },
      onDone: {
        target: S.Done,
      },
    },
    [S.Done]: {
      type: 'final',
    },
  },
  output: ({context: {error}, self: {id}}) => {
    if (error) {
      return {
        type: 'ERROR',
        error,
        id,
      };
    }
    return {
      type: 'OK',
      id,
    };
  },
});
