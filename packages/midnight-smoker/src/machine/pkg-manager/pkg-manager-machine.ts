import {type SomeSmokerError} from '#error/base-error';
import {InstallError} from '#error/install-error';
import {type PackError, type PackParseError} from '#error/pack-error';
import {type Executor} from '#executor';
import {
  ERROR,
  FAILED,
  FINAL,
  OK,
  PARALLEL,
  makeId,
  type ActorOutput,
} from '#machine/util';
import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type InstallManifest} from '#schema/install-manifest';
import {type InstallResult} from '#schema/install-result';
import {type LintManifest} from '#schema/lint-manifest';
import {
  PkgManagerContextSchema,
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerOpts,
} from '#schema/pkg-manager-def';
import {
  type BaseRuleConfigRecord,
  type SomeRuleConfig,
} from '#schema/rule-options';
import {
  type LintResult,
  type LintResultFailed,
  type LintResultOk,
  type RuleResult,
} from '#schema/rule-result';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {type RunScriptResult} from '#schema/run-script-result';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {type WorkspaceInfo} from '#schema/workspaces';
import {isSmokerError} from '#util/error-util';
import {type FileManager} from '#util/filemanager';
import {head, isEmpty, keyBy, partition} from 'lodash';
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
  type AnyActorRef,
} from 'xstate';
import {
  type CtrlPkgInstallBeginEvent,
  type CtrlPkgInstallFailedEvent,
  type CtrlPkgInstallOkEvent,
  type CtrlPkgManagerInstallBeginEvent,
  type CtrlPkgManagerInstallFailedEvent,
  type CtrlPkgManagerInstallOkEvent,
} from '../control/install-events';
import {
  type CtrlPkgManagerLintBeginEvent,
  type CtrlPkgManagerLintFailedEvent,
  type CtrlPkgManagerLintOkEvent,
  type CtrlRuleBeginEvent,
  type CtrlRuleFailedEvent,
  type CtrlRuleOkEvent,
} from '../control/lint-events';
import {
  type CtrlPkgManagerPackBeginEvent,
  type CtrlPkgManagerPackFailedEvent,
  type CtrlPkgManagerPackOkEvent,
  type CtrlPkgPackBeginEvent,
  type CtrlPkgPackFailedEvent,
  type CtrlPkgPackOkEvent,
} from '../control/pack-events';
import {
  type CtrlPkgManagerRunScriptsBeginEvent,
  type CtrlPkgManagerRunScriptsFailedEvent,
  type CtrlPkgManagerRunScriptsOkEvent,
  type CtrlRunScriptBeginEvent,
  type CtrlRunScriptFailedEvent,
  type CtrlRunScriptOkEvent,
  type CtrlRunScriptSkippedEvent,
} from '../control/script-events';
import {type CtrlLingeredEvent} from '../control/smoker-events';
import {
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
  type PkgManagerMachineRuleEndEvent,
  type RunScriptOutput,
} from './pkg-manager-machine-events';
import {RuleMachine} from './rule-machine';

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
  RunningScripts: 'runningScripts',
  Running: 'running',
  Shutdown: 'shutdown',
  CleanupFilesystem: 'cleanupFilesystem',
  TeardownLifecycle: 'teardownLifecycle',
} as const;

function isWorkspaceManifest(
  value: InstallManifest,
): value is InstallManifest & {
  installPath: string;
  localPath: string;
  isAdditional?: false;
} {
  return Boolean(value.installPath && value.localPath && !value.isAdditional);
}

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

  packQueue: WorkspaceInfo[];

  ruleResultMap: Map<string, Map<string, RuleResult[]>>;

  runScriptManifests?: RunScriptManifest[];

  runScriptQueue?: RunScriptItem[];

  runScriptResults?: RunScriptResult[];

  shouldLint: boolean;

  shouldShutdown: boolean;

  tmpdir?: string;
  ruleMachineRefs?: Record<string, ActorRefFrom<typeof RuleMachine>>;
}

export interface PkgManagerMachineInput {
  additionalDeps?: string[];

  def: PkgManagerDef;

  executor: Executor;

  fileManager: FileManager;

  index: number;

  linger?: boolean;

  opts?: PkgManagerOpts;

  parentRef: AnyActorRef;

  ruleConfigs: BaseRuleConfigRecord;

  ruleDefs?: SomeRuleDef[];

  ruleIds?: WeakMap<SomeRuleDef, string>;

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
    RuleMachine,
    teardownPkgManager,
    setupPkgManager,
    createTempDir,
    prepareLintItem,
    runScript,
    pack,
    pruneTempDir,
    install,
  },
  actions: {
    sendLingered: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): CtrlLingeredEvent => {
        const {tmpdir} = context;
        assert.ok(tmpdir);
        return {
          type: 'LINGERED',
          directory: tmpdir,
        };
      },
    ),
    sendRuleEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self, context},
        {
          result,
          type,
          ruleId,
          config,
          ...output
        }: CheckOutput & {config: SomeRuleConfig},
      ): CtrlRuleFailedEvent | CtrlRuleOkEvent => {
        const {id: sender} = self;
        const {spec} = context;
        return type === OK
          ? {
              ...output,
              config,
              result,
              pkgManager: spec.toJSON(),
              rule: ruleId,
              sender,
              type: 'LINT.RULE_OK',
            }
          : {
              ...output,
              config,
              result,
              pkgManager: spec.toJSON(),
              rule: ruleId,
              sender,
              type: 'LINT.RULE_FAILED',
            };
      },
    ),

    /**
     * The only reason we keep this around at all is so that the
     * `isInstallationComplete` guard has something to compare against.
     */
    appendInstallResult: assign({
      installResults: (
        {context: {installResults = []}},
        installResult: InstallResult,
      ) => [...installResults, installResult],
    }),
    appendRunScriptManifest: assign({
      runScriptManifests: (
        {context: {runScriptManifests = []}},
        runScriptManifest: RunScriptManifest,
      ) => [...runScriptManifests, runScriptManifest],
    }),
    appendLintManifest: assign({
      lintManifests: (
        {context: {lintManifests = []}},
        lintManifest: LintManifest,
      ) => [...lintManifests, lintManifest],
    }),
    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: RunScriptResult,
      ) => [...runScriptResults, runScriptResult],
    }),
    prepareLintItem: enqueueActions(
      ({enqueue, context: {fileManager}}, manifest: LintManifest) => {
        enqueue.spawnChild('prepareLintItem', {
          id: `prepareLintItem.${manifest.installPath}`,
          input: {
            lintItem: {
              signal: new AbortController().signal,
              manifest,
            },
            fileManager,
          },
        });
      },
    ),
    createPkgManagerContext: assign({
      ctx: ({
        context: {spec, tmpdir, executor, workspaceInfo, useWorkspaces, opts},
      }) =>
        PkgManagerContextSchema.parse({
          spec,
          tmpdir,
          executor,
          workspaceInfo,
          useWorkspaces,
          ...opts,
        }),
    }),
    shutdown: assign({
      shouldShutdown: true,
    }),
    enqueueInstallItem: assign({
      installQueue: (
        {context: {installQueue = []}},
        installManifest: InstallManifest,
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
      ({
        self,
        context: {workspaceInfo, spec},
      }): CtrlPkgManagerPackBeginEvent => {
        return {
          sender: self.id,
          type: 'PACK.PKG_MANAGER_PACK_BEGIN',
          pkgManager: spec.toJSON(),
          workspaceInfo,
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
        return error
          ? {
              type: 'PACK.PKG_MANAGER_PACK_FAILED',
              error: error as PackError | PackParseError,
              ...data,
            }
          : {
              type: 'PACK.PKG_MANAGER_PACK_OK',
              manifests: installManifests,
              ...data,
            };
      },
    ),
    sendPkgManagerInstallBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self,
        context: {spec, installManifests = []},
      }): CtrlPkgManagerInstallBeginEvent => ({
        manifests: installManifests,
        sender: self.id,
        type: 'INSTALL.PKG_MANAGER_INSTALL_BEGIN',
        pkgManager: spec.toJSON(),
      }),
    ),
    sendPkgManagerInstallEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {installManifests = [], spec, error},
      }): CtrlPkgManagerInstallOkEvent | CtrlPkgManagerInstallFailedEvent =>
        isSmokerError(InstallError, error)
          ? {
              manifests: installManifests,
              type: 'INSTALL.PKG_MANAGER_INSTALL_FAILED',
              pkgManager: spec.toJSON(),
              sender,
              error,
            }
          : {
              type: 'INSTALL.PKG_MANAGER_INSTALL_OK',
              manifests: installManifests,
              pkgManager: spec.toJSON(),
              sender,
            },
    ),
    raiseRuleEnd: raise(
      (
        {self: {id: sender}},
        {output, config}: {output: CheckOutput; config: SomeRuleConfig},
      ): PkgManagerMachineRuleEndEvent => ({
        type: 'RULE_END',
        config,
        output,
        sender,
      }),
    ),
    sendRunScriptEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {spec}},
        {result, manifest}: RunScriptOutput,
      ):
        | CtrlRunScriptOkEvent
        | CtrlRunScriptFailedEvent
        | CtrlRunScriptSkippedEvent => {
        const baseEventData = {
          pkgManager: spec.toJSON(),
          rawResult: result.rawResult,
          manifest,
          sender,
        };

        if (result.error) {
          return {
            ...baseEventData,
            type: 'SCRIPT.RUN_SCRIPT_FAILED',
            error: result.error,
          };
        }
        if (result.skipped) {
          return {
            ...baseEventData,
            type: 'SCRIPT.RUN_SCRIPT_SKIPPED',
            skipped: true,
          };
        }
        assert.ok(result.rawResult);
        return {
          ...baseEventData,
          type: 'SCRIPT.RUN_SCRIPT_OK',
          rawResult: result.rawResult,
        };
      },
    ),
    drainRunScriptQueue: enqueueActions(
      ({
        enqueue,
        self: {id: sender},
        context: {runScriptQueue, spec, scripts, ctx, parentRef, def},
      }) => {
        assert.ok(runScriptQueue);
        assert.ok(scripts);
        assert.ok(ctx);

        const queue = [...runScriptQueue];
        while (queue.length) {
          const job = queue.shift();
          assert.ok(job);
          const {runScriptManifest, signal} = job;
          const evt: CtrlRunScriptBeginEvent = {
            type: 'SCRIPT.RUN_SCRIPT_BEGIN',
            pkgManager: spec.toJSON(),
            manifest: runScriptManifest,
            sender,
          };
          enqueue.sendTo(parentRef, evt);
          enqueue.spawnChild('runScript', {
            id: `runScript.${runScriptManifest.pkgName}-${makeId()}`,
            input: {
              def,
              ctx: {
                runScriptManifest,
                signal,
                ...ctx,
              },
            },
          });
        }
        enqueue.assign({
          runScriptQueue: [],
        });
      },
    ),
    drainPackQueue: enqueueActions(
      ({
        self: {id: sender},
        enqueue,
        context: {signal, def, ctx, packQueue, spec, parentRef},
      }) => {
        assert.ok(ctx);
        const queue = [...packQueue];
        while (queue.length) {
          const workspace = queue.shift();
          assert.ok(workspace);
          const evt: CtrlPkgPackBeginEvent = {
            sender,
            type: 'PACK.PKG_PACK_BEGIN',
            pkgManager: spec.toJSON(),
            workspace,
          };
          enqueue.sendTo(parentRef, evt);
          enqueue.spawnChild('pack', {
            id: `pack.${workspace.pkgName}`,
            input: {
              def,
              ctx: {
                ...ctx,
                ...workspace,
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
    sendPkgPackOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {spec}},
        installManifest: InstallManifest,
      ): CtrlPkgPackOkEvent => {
        assert.ok(installManifest.localPath);
        return {
          sender,
          type: 'PACK.PKG_PACK_OK',
          pkgManager: spec.toJSON(),
          workspace: <WorkspaceInfo>{
            localPath: installManifest.localPath,
            pkgName: installManifest.pkgName,
          },
          installManifest,
        };
      },
    ),
    sendPkgManagerRunScriptsBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {spec, runScriptManifests = []},
      }): CtrlPkgManagerRunScriptsBeginEvent => {
        return {
          type: 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
          manifests: runScriptManifests,
          pkgManager: spec.toJSON(),
        };
      },
    ),
    sendPkgManagerRunScriptsEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {runScriptManifests = [], runScriptResults = [], spec},
      }):
        | CtrlPkgManagerRunScriptsOkEvent
        | CtrlPkgManagerRunScriptsFailedEvent => {
        const type = runScriptResults?.some((r) => r.error)
          ? 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED'
          : 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK';
        return {
          type,
          pkgManager: spec.toJSON(),
          results: runScriptResults,
          manifests: runScriptManifests,
        };
      },
    ),

    /**
     * Drains the lint queue
     *
     * Spawns check actors; one per lint queue item per rule
     */
    drainLintQueue: enqueueActions(
      ({
        self: {id: sender},
        enqueue,
        context: {
          spec,
          ruleMachineRefs,
          ruleIds,
          ruleConfigs,
          lintQueue,
          ruleDefs,
          parentRef,
        },
      }) => {
        assert.ok(lintQueue);
        assert.ok(ruleDefs);
        assert.ok(ruleIds);
        assert.ok(ruleMachineRefs);

        const queue = [...lintQueue];
        while (queue.length) {
          const job = queue.shift();
          assert.ok(job);

          for (const def of ruleDefs) {
            const ruleId = ruleIds.get(def);
            assert.ok(ruleId);
            const config = ruleConfigs[ruleId];
            const evt: CtrlRuleBeginEvent = {
              sender,
              type: 'LINT.RULE_BEGIN',
              manifest: job.manifest,
              rule: ruleId,
              config,
              pkgManager: spec.toJSON(),
            };
            enqueue.sendTo(parentRef, evt);

            const ref = ruleMachineRefs[ruleId];
            assert(ref);

            const {pkgJson, pkgJsonPath, manifest} = job;
            enqueue.sendTo(ref, {
              type: 'CHECK',
              ctx: {
                ...manifest,
                ruleId,
                severity: config.severity,
                pkgJson,
                pkgJsonPath,
                pkgManager: `${spec}`,
              },
              manifest,
            });
          }
        }
        enqueue.assign({
          lintQueue: [],
        });
      },
    ),
    appendInstallManifest: assign({
      installManifests: (
        {context: {installManifests = []}},
        installManifest: InstallManifest,
      ) => [...installManifests, installManifest],
    }),
    assignTmpdir: assign({
      tmpdir: (_, tmpdir: string) => tmpdir,
    }),
    handleInstallResult: enqueueActions(
      (
        {enqueue, context: {shouldLint, scripts = []}},
        installResult: InstallResult,
      ) => {
        const {installManifest} = installResult;
        if (isWorkspaceManifest(installManifest)) {
          const {localPath, pkgName, installPath} = installManifest;
          if (shouldLint) {
            enqueue.raise({
              type: 'LINT',
              manifest: {
                pkgName,
                installPath,
                localPath,
              },
            });
          }
          for (const script of scripts) {
            enqueue.raise({
              type: 'RUN_SCRIPT',
              manifest: {
                pkgName,
                cwd: installPath,
                localPath,
                script,
              },
            });
          }
        }
      },
    ),
    sendPkgInstallOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {spec}},
        {installManifest, rawResult}: InstallResult,
      ): CtrlPkgInstallOkEvent => ({
        sender,
        rawResult,
        type: 'INSTALL.PKG_INSTALL_OK',
        installManifest,
        pkgManager: spec.toJSON(),
      }),
    ),
    sendPkgManagerLintBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({self: {id: sender}, context: {spec}}): CtrlPkgManagerLintBeginEvent => {
        return {
          type: 'LINT.PKG_MANAGER_LINT_BEGIN',
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
              (r) => r.type === OK,
            );
            hasIssues = hasIssues || Boolean(failedResults.length);

            assert.ok(manifestsByInstallPath[installPath]);

            const retval = failedResults.length
              ? <LintResultFailed>{
                  ...manifestsByInstallPath[installPath],
                  type: FAILED,
                  results,
                }
              : <LintResultOk>{
                  ...manifestsByInstallPath[installPath],
                  type: OK,
                  results: okResults,
                };

            return retval;
          },
        );

        return error || hasIssues
          ? {
              type: 'LINT.PKG_MANAGER_LINT_FAILED',
              pkgManager: spec.toJSON(),
              sender,
              results: lintResults,
            }
          : {
              type: 'LINT.PKG_MANAGER_LINT_OK',
              pkgManager: spec.toJSON(),
              results: lintResults,
              sender,
            };
      },
    ),

    /**
     * Creates install manifests for each additional dep and appends them as
     * {@link InstallItem}s to the install queue
     */
    enqueueAdditionalDeps: assign({
      installQueue: ({
        context: {installQueue = [], tmpdir, additionalDeps},
      }) => {
        assert.ok(tmpdir);
        assert.ok(isEmpty(installQueue));
        return additionalDeps.map((dep) => ({
          installManifest: {
            cwd: tmpdir,
            pkgSpec: dep,
            pkgName: dep,
            isAdditional: true,
          },
        }));
      },
    }),
    shouldLint: assign({
      shouldLint: true,
    }),
    takeInstallJob: assign({
      currentInstallJob: ({context: {installQueue}}) => {
        assert.ok(installQueue);
        return head(installQueue);
      },
      installQueue: ({context: {installQueue}}) => {
        assert.ok(installQueue);
        return installQueue.slice(1);
      },
    }),
    sendPkgInstallBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {spec, currentInstallJob},
      }): CtrlPkgInstallBeginEvent => {
        assert.ok(currentInstallJob);
        return {
          type: 'INSTALL.PKG_INSTALL_BEGIN',
          installManifest: currentInstallJob.installManifest,
          pkgManager: spec.toJSON(),
          sender,
        };
      },
    ),
    sendPkgInstallFailed: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {spec, currentInstallJob}},
        error: InstallError,
      ): CtrlPkgInstallFailedEvent => {
        assert.ok(currentInstallJob);
        return {
          installManifest: currentInstallJob.installManifest,
          sender,
          type: 'INSTALL.PKG_INSTALL_FAILED',
          error,
          pkgManager: spec.toJSON(),
        };
      },
    ),
    sendPkgPackFailedEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {spec}},
        error: PackError | PackParseError,
      ): CtrlPkgPackFailedEvent => ({
        sender,
        workspace: error.context.workspace,
        type: 'PACK.PKG_PACK_FAILED',
        error,
        pkgManager: spec.toJSON(),
      }),
    ),
    freeInstallResults: assign({
      installResults: [],
    }),
    freeRuleResultMap: assign({
      ruleResultMap: new Map(),
    }),
    updateRuleResultMap: assign({
      ruleResultMap: ({context: {ruleResultMap}}, output: CheckOutput) => {
        // ☠️
        const ruleResultsForManifestMap =
          ruleResultMap.get(output.ctx.installPath) ??
          new Map<string, RuleResult[]>();
        const ruleResultsForRuleIdMap =
          ruleResultsForManifestMap.get(output.ruleId) ?? [];
        if (output.type === OK) {
          ruleResultsForRuleIdMap.push(output.result);
        } else {
          ruleResultsForRuleIdMap.push(...output.result);
        }
        ruleResultsForManifestMap.set(output.ruleId, ruleResultsForRuleIdMap);
        ruleResultMap.set(output.ctx.installPath, ruleResultsForManifestMap);
        return new Map(ruleResultMap);
      },
    }),
    assignError: assign({error: (_, error: SomeSmokerError) => error}),
  },
  guards: {
    shouldPruneTempDir: ({context: {linger}}) => !linger,
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
    hasRules: ({context: {ruleDefs: rules}}) => !isEmpty(rules),
    shouldLint: and(['hasRules', ({context: {shouldLint}}) => shouldLint]),
    shouldRunScripts: ({context: {scripts}}) => !isEmpty(scripts),
    isLintableInstallManifest: (
      {context: {shouldLint}},
      installManifest: InstallManifest,
    ) =>
      Boolean(
        shouldLint &&
          installManifest.localPath &&
          installManifest.installPath &&
          !installManifest.isAdditional,
      ),
    isRunnableManifest: (
      {context: {scripts}},
      installManifest: InstallManifest,
    ) =>
      Boolean(
        !isEmpty(scripts) &&
          installManifest.localPath &&
          installManifest.installPath &&
          !installManifest.isAdditional,
      ),
    didRunAllRulesForManifest: (
      {context: {ruleResultMap, ruleDefs: rules}},
      manifest: LintManifest,
    ) => {
      return Boolean(
        rules && ruleResultMap.get(manifest.installPath)?.size === rules.length,
      );
    },
    isLintingComplete: and([
      not('hasLintJobs'),
      'hasRules',
      ({
        context: {lintManifests = [], ruleResultMap, ruleDefs: rules = []},
      }) => {
        if (isEmpty(lintManifests) || !ruleResultMap.size || isEmpty(rules)) {
          return false;
        }
        const ruleCount = rules.length;
        return lintManifests.every(
          (manifest) =>
            ruleResultMap.get(manifest.installPath)?.size === ruleCount,
        );
      },
    ]),
    isRunningComplete: and([
      'shouldRunScripts',
      ({context: {installManifests = [], runScriptResults = []}}) =>
        !isEmpty(runScriptResults) &&
        installManifests.filter(({isAdditional, installPath}) =>
          Boolean(!isAdditional && installPath),
        ).length === runScriptResults.length,
    ]),
  },
}).createMachine({
  id: 'PkgManagerMachine',
  exit: [
    log(({context: {spec}}) => `PkgManagerMachine ${spec} exiting gracefully`),
  ],
  entry: [
    log(({context: {spec, shouldLint, scripts}}) => {
      let msg = `PkgManagerMachine ${spec} starting up`;
      if (shouldLint) {
        msg += '; will lint';
      }
      if (!isEmpty(scripts)) {
        msg += '; will run scripts';
      }
      return msg;
    }),
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
          type: FINAL,
        },
      },
      onDone: {
        target: S.Working,
      },
    },
    [S.Working]: {
      description:
        'This is where most things happen. As soon as a pkg is packed, it will be installed. As soon as it is installed, we can lint or run scripts; this all happens in parallel',
      type: PARALLEL,
      // we can start installing additional deps as soon as we have a tmpdir
      entry: [{type: 'enqueueAdditionalDeps'}],
      states: {
        [S.Packing]: {
          description:
            'Packs chosen workspaces in parallel. The packing queue should be non-empty when entering this state',
          entry: [
            log(
              ({context: {packQueue}}) =>
                `packing ${packQueue.length} workspaces`,
            ),
          ],
          initial: S.PackingPkgs,
          states: {
            [S.PackingPkgs]: {
              entry: [{type: 'sendPkgManagerPackBegin'}],
              exit: [{type: 'sendPkgManagerPackEnd'}],
              always: [
                {
                  description:
                    'Immediately transition to Errored state if an error occurs',
                  guard: {type: 'hasError'},
                  target: S.Errored,
                },
                {
                  guard: {type: 'isPackingComplete'},
                  target: S.Done,
                },
                {
                  guard: {type: 'hasPackJobs'},
                  actions: [{type: 'drainPackQueue'}],
                },
              ],
              on: {
                'xstate.done.actor.pack.*': {
                  actions: [
                    {
                      type: 'appendInstallManifest',
                      params: ({event: {output}}) => output,
                    },
                    {
                      type: 'sendPkgPackOk',
                      params: ({event: {output}}) => output,
                    },
                    {
                      type: 'enqueueInstallItem',
                      params: ({event: {output}}) => output,
                    },
                  ],
                },
                'xstate.error.actor.pack.*': {
                  actions: [
                    log('pack errored!'),
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => error,
                    },
                    {
                      type: 'sendPkgPackFailedEvent',
                      params: ({event: {error}}) => error,
                    },
                  ],
                },
              },
            },
            [S.Errored]: {
              entry: [log('packing errored')],
              type: FINAL,
            },
            [S.Done]: {
              entry: [log('packing complete')],
              type: FINAL,
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
              entry: [{type: 'sendPkgManagerInstallBegin'}],
              exit: [
                {type: 'sendPkgManagerInstallEnd'},
                {type: 'freeInstallResults'},
              ],
              initial: S.InstallPkg,
              states: {
                [S.InstallPkg]: {
                  entry: [
                    {
                      type: 'takeInstallJob',
                    },
                    {
                      type: 'sendPkgInstallBegin',
                    },
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
                    onDone: {
                      actions: [
                        {
                          type: 'sendPkgInstallOk',
                          params: ({event: {output}}) => output,
                        },
                        {
                          type: 'appendInstallResult',
                          params: ({event: {output}}) => output,
                        },
                        {
                          type: 'handleInstallResult',
                          params: ({event: {output}}) => output,
                        },
                      ],
                      target: S.InstalledPkg,
                    },

                    onError: {
                      actions: [
                        {
                          type: 'sendPkgInstallFailed',
                          params: ({event: {error}}) => error as InstallError,
                        },
                        {
                          type: 'assignError',
                          params: ({event: {error}}) => error as InstallError,
                        },
                      ],
                      target: S.Errored,
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
                  type: FINAL,
                },
                [S.Errored]: {
                  type: FINAL,
                },
              },
              onDone: {
                target: S.Done,
              },
            },
            [S.Done]: {
              entry: [log('installation complete')],
              type: FINAL,
            },
            [S.Errored]: {
              entry: [log('installation errored')],
              type: FINAL,
            },
          },
        },
        [S.RunningScripts]: {
          initial: S.Idle,
          states: {
            [S.Idle]: {
              description:
                'A list of scripts should be provided within the machine input; if it is empty, we can exit early',
              always: [
                {
                  guard: {type: 'shouldRunScripts'},
                  target: S.Running,
                },
                {
                  guard: not('shouldRunScripts'),
                  target: S.Done,
                  actions: [log('no scripts to run')],
                },
              ],
            },
            [S.Running]: {
              entry: [{type: 'sendPkgManagerRunScriptsBegin'}],
              always: [
                {
                  guard: {type: 'hasError'},
                  target: S.Errored,
                },
                {
                  guard: {type: 'isRunningComplete'},
                  target: S.Done,
                },
                {
                  guard: {type: 'hasRunScriptJobs'},
                  actions: [{type: 'drainRunScriptQueue'}],
                },
              ],
              exit: [{type: 'sendPkgManagerRunScriptsEnd'}],
              on: {
                RUN_SCRIPT: {
                  actions: [
                    {
                      type: 'appendRunScriptManifest',
                      params: ({event: {manifest}}) => manifest,
                    },
                    {
                      type: 'enqueueRunScriptItem',
                      params: ({event: {manifest}}) => ({
                        runScriptManifest: manifest,
                        // TODO: fix
                        signal: new AbortController().signal,
                      }),
                    },
                  ],
                },
                'xstate.done.actor.runScript.*': {
                  actions: [
                    {
                      type: 'appendRunScriptResult',
                      params: ({
                        event: {
                          output: {result},
                        },
                      }) => result,
                    },
                    {
                      type: 'sendRunScriptEnd',
                      params: ({event: {output}}) => output,
                    },
                  ],
                },
                'xstate.error.actor.runScript.*': {
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => error,
                    },
                  ],
                },
              },
            },
            [S.Errored]: {
              entry: log('script running errored'),
              type: FINAL,
            },
            [S.Done]: {
              entry: log('script running complete'),
              type: FINAL,
            },
          },
        },
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
            CHECK_RESULT: {
              description:
                'Once a RuleMachine has completed a rule check, it will send this event; we want to raise it locally as a RULE_END event to avoid duplication, since we must conditionally take a different action if all checks have been completed',
              actions: [
                log(
                  ({
                    event: {
                      output: {
                        ruleId,
                        ctx: {pkgName},
                      },
                    },
                  }) => `ran rule ${ruleId} on ${pkgName}`,
                ),
                {
                  type: 'updateRuleResultMap',
                  params: ({event: {output}}) => output,
                },
                {
                  type: 'raiseRuleEnd',
                  params: ({event: {output, config}}) => ({output, config}),
                },
              ],
            },
          },
          states: {
            [S.Idle]: {
              description:
                'If the `lint` flag was not passed into the Smoker options, we can exit early',
              always: [
                {
                  guard: {type: 'shouldLint'},
                  target: S.LintingPkgs,
                },
                {
                  guard: not('shouldLint'),
                  target: S.Done,
                },
              ],
            },
            // TODO error handling
            [S.LintingPkgs]: {
              entry: [
                {type: 'sendPkgManagerLintBegin'},
                assign({
                  ruleMachineRefs: ({
                    self,
                    spawn,
                    context: {ruleDefs, ruleIds, ruleConfigs},
                  }) => {
                    assert.ok(ruleDefs);
                    assert.ok(ruleIds);
                    return Object.fromEntries(
                      ruleDefs.map((def) => {
                        const ruleId = ruleIds.get(def);
                        assert.ok(ruleId);
                        const id = `rule.${makeId()}-${ruleId}`;
                        const actorRef = spawn('RuleMachine', {
                          id,
                          input: {
                            def,
                            ruleId,
                            config: ruleConfigs[ruleId],
                            parentRef: self,
                          },
                        });
                        // INDEXED BY RULE ID
                        return [ruleId, actorRef];
                      }),
                    );
                  },
                }),
              ],
              always: [
                {
                  guard: {type: 'hasLintJobs'},
                  actions: [{type: 'drainLintQueue'}],
                },
              ],
              exit: [
                {type: 'sendPkgManagerLintEnd'},
                {type: 'freeRuleResultMap'},
              ],
              on: {
                LINT: {
                  actions: [
                    {
                      type: 'appendLintManifest',
                      params: ({event: {manifest}}) => manifest,
                    },
                    {
                      type: 'prepareLintItem',
                      params: ({event: {manifest}}) => manifest,
                    },
                  ],
                },
                RULE_END: [
                  {
                    description:
                      'Send the RuleOk or RuleFailed event to the parent, then exit the state. This event should only be sent via raise()',
                    guard: {type: 'isLintingComplete'},
                    target: S.Done,
                    actions: [
                      {
                        type: 'sendRuleEnd',
                        params: ({event}) => ({
                          ...event.output,
                          config: event.config,
                        }),
                      },
                    ],
                  },
                  {
                    description:
                      'Send the RuleOk or RuleFailed event to the parent. This event should only be sent via raise()',
                    actions: [
                      {
                        type: 'sendRuleEnd',
                        params: ({event}) => ({
                          ...event.output,
                          config: event.config,
                        }),
                      },
                    ],
                  },
                ],
              },
            },
            [S.Done]: {
              entry: log('linting complete'),
              type: FINAL,
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
      initial: S.Idle,
      states: {
        [S.Idle]: {
          always: [
            {
              guard: {type: 'shouldPruneTempDir'},
              target: S.CleanupFilesystem,
              actions: [
                log(({context: {tmpdir}}) => `will destroy temp dir ${tmpdir}`),
              ],
            },
            {
              guard: not('shouldPruneTempDir'),
              target: S.TeardownLifecycle,
              actions: [
                {
                  type: 'sendLingered',
                },
                log(
                  ({context: {tmpdir}}) =>
                    `leaving temp dir to linger: ${tmpdir}`,
                ),
              ],
            },
          ],
        },
        [S.CleanupFilesystem]: {
          description: 'Prunes temp dir',
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
          description: 'Runs teardown() of PkgManagerDef, if any',
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
          type: FINAL,
        },
      },
      onDone: {
        target: S.Done,
      },
    },
    [S.Done]: {
      type: FINAL,
    },
  },
  output: ({context: {error}, self: {id}}): PkgManagerMachineOutput =>
    error ? {type: ERROR, error, id} : {type: OK, id},
});
