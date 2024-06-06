import {ERROR, FAILED, FINAL, OK, PARALLEL, SKIPPED} from '#constants';
import {AbortError} from '#error/abort-error';
import {fromUnknownError} from '#error/from-unknown-error';
import {InstallError} from '#error/install-error';
import {LifecycleError} from '#error/lifecycle-error';
import {MachineError} from '#error/machine-error';
import {type PackError, type PackParseError} from '#error/pack-error';
import {TempDirError} from '#error/temp-dir-error';
import {type Executor} from '#executor';
import {type ActorOutput} from '#machine/util';
import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type CheckResult} from '#schema/check-result';
import {type InstallManifest} from '#schema/install-manifest';
import {type InstallResult} from '#schema/install-result';
import {type LintManifest} from '#schema/lint-manifest';
import {
  type LintResult,
  type LintResultFailed,
  type LintResultOk,
} from '#schema/lint-result';
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
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {type RunScriptResult} from '#schema/run-script-result';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {type WorkspaceInfo} from '#schema/workspaces';
import {isSmokerError} from '#util/error-util';
import {type FileManager} from '#util/filemanager';
import {serialize} from '#util/serialize';
import {uniqueId} from '#util/unique-id';
import {asResult} from '#util/util';
import {head, isEmpty, keyBy, partition} from 'lodash';
import assert from 'node:assert';
import {type ValueOf} from 'type-fest';
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
import {type StaticPkgManagerSpec} from '../../pkg-manager';
import type * as InstallEvents from '../control/install-events';
import type * as LintEvents from '../control/lint-events';
import type * as PackEvents from '../control/pack-events';
import type * as ScriptEvents from '../control/script-events';
import type * as SmokerEvents from '../control/smoker-events';
import {type RuleInitPayload} from '../loader/loader-machine-types';
import {
  createTempDir,
  install,
  pack,
  pruneTempDir,
  runScript,
  setupPkgManager,
  teardownPkgManager,
  type InstallInput,
} from './pkg-manager-machine-actors';
import type * as Event from './pkg-manager-machine-events';
import {RuleMachine} from './rule-machine';

export type PkgManagerMachineOutput = ActorOutput;

export interface InstallItem {
  installManifest: InstallManifest;
}

const Tag = {
  Error: 'Error',
  Lifecycle: 'Lifecycle',
  Aborted: 'Aborted',
} as const;

function isWorkspaceManifest(value: InstallManifest): value is InstallManifest &
  WorkspaceInfo & {
    installPath: string;
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

  error?: MachineError;

  packError?: PackError | PackParseError;

  installError?: InstallError;

  installManifests?: InstallManifest[];

  installQueue?: InstallItem[];

  installResults?: InstallResult[];

  lintManifests?: LintManifest[];

  lintQueue?: LintManifest[];

  opts: PkgManagerOpts;

  packQueue: WorkspaceInfo[];

  ruleDefs?: SomeRuleDef[];

  ruleInitPayloads: RuleInitPayload[];

  ruleResultMap: Map<string, Map<string, CheckResult[]>>;

  runScriptManifests?: RunScriptManifest[];

  runScriptQueue?: RunScriptItem[];

  runScriptResults?: RunScriptResult[];

  shouldLint: boolean;

  shouldShutdown: boolean;

  tmpdir?: string;
  ruleMachineRefs?: Record<string, ActorRefFrom<typeof RuleMachine>>;

  abortController: AbortController;
  pkgManager: StaticPkgManagerSpec;
}

export interface PkgManagerMachineInput {
  additionalDeps?: string[];
  plugin: StaticPluginMetadata;
  def: PkgManagerDef;

  executor: Executor;

  fileManager: FileManager;

  index: number;

  linger?: boolean;

  opts?: PkgManagerOpts;

  parentRef: AnyActorRef;

  ruleConfigs: BaseRuleConfigRecord;

  ruleInitPayloads?: RuleInitPayload[];

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
}

export type PkgManagerMachineTags = ValueOf<typeof Tag>;

export const PkgManagerMachine = setup({
  types: {
    input: {} as PkgManagerMachineInput,
    context: {} as PkgManagerMachineContext,
    events: {} as Event.PkgManagerMachineEvents,
    output: {} as PkgManagerMachineOutput,
    tags: {} as PkgManagerMachineTags,
  },
  actors: {
    RuleMachine,
    teardownPkgManager,
    setupPkgManager,
    createTempDir,
    runScript,
    pack,
    pruneTempDir,
    install,
  },
  actions: {
    sendLingered: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): SmokerEvents.CtrlLingeredEvent => {
        const {tmpdir} = context;
        assert.ok(tmpdir);
        return {
          type: 'LINGERED',
          directory: tmpdir,
        };
      },
    ),
    sendRuleEnd: enqueueActions(
      (
        {enqueue, self, context: {parentRef, pkgManager}},
        {
          result,
          type,
          ruleId,
          config,
          ...output
        }: Event.CheckOutput & {config: SomeRuleConfig},
      ) => {
        const {id: sender} = self;
        const ruleEndEvent: LintEvents.CtrlRuleEndEvent = {
          ...output,
          config,
          result,
          pkgManager,
          rule: ruleId,
          sender,
          type: 'LINT.RULE_END',
        };
        enqueue.sendTo(parentRef, ruleEndEvent);
        const specificRuleEndEvent:
          | LintEvents.CtrlRuleOkEvent
          | LintEvents.CtrlRuleFailedEvent =
          type === OK
            ? {
                ...output,
                config,
                result,
                pkgManager,
                rule: ruleId,
                sender,
                type: 'LINT.RULE_OK',
              }
            : {
                ...output,
                config,
                result,
                pkgManager,
                rule: ruleId,
                sender,
                type: 'LINT.RULE_FAILED',
              };
        enqueue.sendTo(parentRef, specificRuleEndEvent);
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
        {runScriptManifest}: RunScriptItem,
      ) => [...runScriptQueue, {runScriptManifest}],
    }),
    enqueueLintItem: assign({
      lintQueue: ({context: {lintQueue = []}}, lintItem: LintManifest) => [
        ...lintQueue,
        lintItem,
      ],
    }),
    sendPkgManagerPackBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self,
        context: {workspaceInfo, pkgManager},
      }): PackEvents.CtrlPkgManagerPackBeginEvent => {
        return {
          sender: self.id,
          type: 'PACK.PKG_MANAGER_PACK_BEGIN',
          pkgManager,
          workspaceInfo: workspaceInfo.map(asResult),
        };
      },
    ),
    sendPkgManagerPackEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id},
        context: {
          packError,
          index: pkgManagerIndex,
          installManifests = [],
          workspaceInfo,
          pkgManager,
        },
      }):
        | PackEvents.CtrlPkgManagerPackOkEvent
        | PackEvents.CtrlPkgManagerPackFailedEvent => {
        const data = {
          index: pkgManagerIndex,
          workspaceInfo: workspaceInfo.map(asResult),
          pkgManager,
          sender: id,
        };
        return packError
          ? {
              type: 'PACK.PKG_MANAGER_PACK_FAILED',
              error: packError,
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
        context: {pkgManager, installManifests = [], workspaceInfo},
      }): InstallEvents.CtrlPkgManagerInstallBeginEvent => ({
        manifests: installManifests,
        sender: self.id,
        type: 'INSTALL.PKG_MANAGER_INSTALL_BEGIN',
        pkgManager,
        workspaceInfo: workspaceInfo.map(asResult),
      }),
    ),
    sendPkgManagerInstallEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {installManifests = [], pkgManager, error, workspaceInfo},
      }):
        | InstallEvents.CtrlPkgManagerInstallOkEvent
        | InstallEvents.CtrlPkgManagerInstallFailedEvent =>
        isSmokerError(InstallError, error)
          ? {
              workspaceInfo: workspaceInfo.map(asResult),
              manifests: installManifests,
              type: 'INSTALL.PKG_MANAGER_INSTALL_FAILED',
              pkgManager,
              sender,
              error,
            }
          : {
              workspaceInfo: workspaceInfo.map(asResult),
              type: 'INSTALL.PKG_MANAGER_INSTALL_OK',
              manifests: installManifests,
              pkgManager,
              sender,
            },
    ),
    raiseRuleEnd: raise(
      (
        _,
        {output, config}: {output: Event.CheckOutput; config: SomeRuleConfig},
      ): Event.PkgManagerMachineRuleEndEvent => {
        return {
          type: 'RULE_END',
          config,
          output,
        };
      },
    ),
    sendRunScriptEnd: enqueueActions(
      (
        {enqueue, self: {id: sender}, context: {pkgManager, parentRef}},
        {result, manifest}: Event.RunScriptOutput,
      ) => {
        const baseEventData = {
          pkgManager,
          manifest,
          sender,
        };
        let evt:
          | ScriptEvents.CtrlRunScriptOkEvent
          | ScriptEvents.CtrlRunScriptFailedEvent
          | ScriptEvents.CtrlRunScriptErrorEvent
          | ScriptEvents.CtrlRunScriptSkippedEvent;
        switch (result.type) {
          case OK: {
            evt = {
              ...baseEventData,
              type: 'SCRIPT.RUN_SCRIPT_OK',
              rawResult: result.rawResult,
            };
            break;
          }
          case FAILED: {
            evt = {
              ...baseEventData,
              type: 'SCRIPT.RUN_SCRIPT_FAILED',
              error: result.error,
              rawResult: result.rawResult,
            };
            break;
          }
          case ERROR: {
            evt = {
              ...baseEventData,
              type: 'SCRIPT.RUN_SCRIPT_ERROR',
              error: result.error,
              rawResult: result.rawResult,
            };
            break;
          }
          case SKIPPED: {
            evt = {
              ...baseEventData,
              type: 'SCRIPT.RUN_SCRIPT_SKIPPED',
            };
            break;
          }
        }
        enqueue.sendTo(parentRef, evt);

        const evtEnd: ScriptEvents.CtrlRunScriptEndEvent = {
          ...evt,
          type: 'SCRIPT.RUN_SCRIPT_END',
        };
        enqueue.sendTo(parentRef, evtEnd);
      },
    ),
    drainRunScriptQueue: enqueueActions(
      ({
        enqueue,
        self: {id: sender},
        context: {
          signal,
          runScriptQueue,
          pkgManager,
          scripts,
          ctx,
          parentRef,
          def,
        },
      }) => {
        assert.ok(runScriptQueue);
        assert.ok(scripts);
        assert.ok(ctx);

        const queue = [...runScriptQueue];
        while (queue.length) {
          const job = queue.shift();
          assert.ok(job);
          const {runScriptManifest} = job;
          const evt: ScriptEvents.CtrlRunScriptBeginEvent = {
            type: 'SCRIPT.RUN_SCRIPT_BEGIN',
            pkgManager,
            manifest: runScriptManifest,
            sender,
          };
          enqueue.sendTo(parentRef, evt);
          const id = uniqueId({
            prefix: 'runScript',
            postfix: runScriptManifest.pkgName,
          });
          enqueue.spawnChild('runScript', {
            id,
            input: {
              def,
              ctx: {
                manifest: runScriptManifest,
                signal,
                ...ctx,
              },
              signal,
              spec: pkgManager,
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
        context: {signal, def, ctx, pkgManager, packQueue, parentRef},
      }) => {
        assert.ok(ctx);
        const queue = [...packQueue];
        while (queue.length) {
          const workspace = queue.shift();
          assert.ok(workspace);
          const evt: PackEvents.CtrlPkgPackBeginEvent = {
            sender,
            type: 'PACK.PKG_PACK_BEGIN',
            pkgManager,
            workspace: asResult(workspace),
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
              signal,
              spec: pkgManager,
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
        {self: {id: sender}, context: {pkgManager}},
        installManifest: InstallManifest,
      ): PackEvents.CtrlPkgPackOkEvent => {
        assert.ok(isWorkspaceManifest(installManifest));
        const workspace = {
          localPath: installManifest.localPath,
          pkgName: installManifest.pkgName,
          pkgJson: installManifest.pkgJson,
          pkgJsonPath: installManifest.pkgJsonPath,
        } as WorkspaceInfo;
        return {
          sender,
          type: 'PACK.PKG_PACK_OK',
          pkgManager,
          workspace: asResult(workspace),
          installManifest: asResult(installManifest),
        };
      },
    ),
    sendPkgManagerRunScriptsBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {pkgManager, runScriptManifests = [], workspaceInfo},
      }): ScriptEvents.CtrlPkgManagerRunScriptsBeginEvent => ({
        workspaceInfo: workspaceInfo.map(asResult),
        type: 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
        manifests: runScriptManifests,
        sender,
        pkgManager,
      }),
    ),
    sendPkgManagerRunScriptsEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {
          runScriptManifests = [],
          runScriptResults = [],
          workspaceInfo,
          pkgManager,
        },
      }):
        | ScriptEvents.CtrlPkgManagerRunScriptsOkEvent
        | ScriptEvents.CtrlPkgManagerRunScriptsFailedEvent => {
        const type = runScriptResults?.some((r) => r.type === ERROR)
          ? 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED'
          : 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK';
        return {
          sender,
          type,
          workspaceInfo: workspaceInfo.map(asResult),
          pkgManager,
          results: runScriptResults,
          manifests: runScriptManifests,
        };
      },
    ),

    /**
     * Drains the lint queue
     *
     * Spawns check actors; one per lint queue item per rule
     *
     * @todo Change this to only take a single item
     */
    drainLintQueue: enqueueActions(
      ({
        self: {id: sender},
        enqueue,
        context: {
          spec,
          ruleMachineRefs,
          ruleConfigs,
          lintQueue,
          ruleInitPayloads,
          parentRef,
          pkgManager,
        },
      }) => {
        assert.ok(lintQueue);
        assert.ok(ruleMachineRefs);

        const queue = [...lintQueue];
        while (queue.length) {
          const job = queue.shift();
          assert.ok(job);

          for (const {id: ruleId} of ruleInitPayloads) {
            assert.ok(ruleId);
            const config = ruleConfigs[ruleId];
            const evt: LintEvents.CtrlRuleBeginEvent = {
              sender,
              type: 'LINT.RULE_BEGIN',
              manifest: asResult(job),
              rule: ruleId,
              config,
              pkgManager,
            };
            enqueue.sendTo(parentRef, evt);

            const ref = ruleMachineRefs[ruleId];
            assert(ref);

            const manifest = job;
            enqueue.sendTo(ref, {
              type: 'CHECK',
              ctx: {
                ...manifest,
                ruleId,
                severity: config.severity,
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
        {enqueue, context: {workspaceInfo, shouldLint, scripts = []}},
        installResult: InstallResult,
      ) => {
        const {installManifest} = installResult;
        if (isWorkspaceManifest(installManifest)) {
          const {localPath, pkgName, installPath} = installManifest;
          const workspace = workspaceInfo.find(
            ({localPath, pkgName}) =>
              localPath === installManifest.localPath &&
              pkgName === installManifest.pkgName,
          );
          assert.ok(workspace);

          if (shouldLint) {
            const lintManifest: LintManifest = {...workspace, installPath};
            enqueue.raise({
              type: 'LINT',
              manifest: lintManifest,
            });
          }
          for (const script of scripts) {
            const runScriptManifest: RunScriptManifest = {
              pkgName,
              cwd: installPath,
              pkgJson: workspace.pkgJson,
              pkgJsonPath: workspace.pkgJsonPath,
              localPath,
              script,
            };

            enqueue.raise({
              type: 'RUN_SCRIPT',
              manifest: runScriptManifest,
            });
          }
        }
      },
    ),
    sendPkgInstallOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self, context: {pkgManager}},
        {installManifest, rawResult}: InstallResult,
      ): InstallEvents.CtrlPkgInstallOkEvent => ({
        sender: self.id,
        rawResult,
        type: 'INSTALL.PKG_INSTALL_OK',
        installManifest,
        pkgManager,
      }),
    ),
    sendPkgManagerLintBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self,
        context: {pkgManager, workspaceInfo},
      }): LintEvents.CtrlPkgManagerLintBeginEvent => {
        return {
          type: 'LINT.PKG_MANAGER_LINT_BEGIN',
          pkgManager,
          workspaceInfo: workspaceInfo.map(asResult),
          sender: self.id,
        };
      },
    ),
    sendPkgManagerLintEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {
          error,
          ruleResultMap,
          pkgManager,
          lintManifests,
          workspaceInfo,
        },
      }):
        | LintEvents.CtrlPkgManagerLintOkEvent
        | LintEvents.CtrlPkgManagerLintFailedEvent => {
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

            const manifest = asResult(manifestsByInstallPath[installPath]);
            assert.ok(manifest);

            const retval = failedResults.length
              ? <LintResultFailed>{
                  ...manifest,
                  type: FAILED,
                  results,
                }
              : <LintResultOk>{
                  ...manifest,
                  type: OK,
                  results: okResults,
                };

            return retval;
          },
        );

        return error || hasIssues
          ? {
              type: 'LINT.PKG_MANAGER_LINT_FAILED',
              pkgManager,
              sender,
              workspaceInfo: workspaceInfo.map(asResult),
              results: lintResults,
            }
          : {
              type: 'LINT.PKG_MANAGER_LINT_OK',
              pkgManager,
              results: lintResults,
              workspaceInfo: workspaceInfo.map(asResult),
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
        context: {installQueue = [], tmpdir, additionalDeps, workspaceInfo},
      }) => {
        if (isEmpty(workspaceInfo)) {
          return installQueue;
        }
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
        context: {pkgManager, currentInstallJob},
      }): InstallEvents.CtrlPkgInstallBeginEvent => {
        assert.ok(currentInstallJob);
        return {
          type: 'INSTALL.PKG_INSTALL_BEGIN',
          installManifest: currentInstallJob.installManifest,
          pkgManager,
          sender,
        };
      },
    ),
    sendPkgInstallFailed: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {pkgManager, currentInstallJob}},
        error: InstallError,
      ): InstallEvents.CtrlPkgInstallFailedEvent => {
        assert.ok(currentInstallJob);
        return {
          installManifest: currentInstallJob.installManifest,
          sender,
          type: 'INSTALL.PKG_INSTALL_FAILED',
          error,
          pkgManager,
        };
      },
    ),
    sendPkgPackFailedEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {pkgManager}},
        error: PackError | PackParseError,
      ): PackEvents.CtrlPkgPackFailedEvent => ({
        sender,
        workspace: asResult(error.context.workspace),
        type: 'PACK.PKG_PACK_FAILED',
        error,
        pkgManager,
      }),
    ),
    freeInstallResults: assign({
      installResults: [],
    }),
    freeRuleResultMap: assign({
      ruleResultMap: new Map(),
    }),
    freeRuleMachineRefs: enqueueActions(
      ({enqueue, context: {ruleMachineRefs = {}}}) => {
        for (const ref of Object.values(ruleMachineRefs)) {
          enqueue.stopChild(ref);
        }
        enqueue.assign({
          ruleMachineRefs: undefined,
        });
      },
    ),
    updateRuleResultMap: assign({
      ruleResultMap: (
        {context: {ruleResultMap}},
        output: Event.CheckOutput,
      ) => {
        // ☠️
        const ruleResultsForManifestMap =
          ruleResultMap.get(output.installPath) ??
          new Map<string, CheckResult[]>();
        const ruleResultsForRuleIdMap =
          ruleResultsForManifestMap.get(output.ruleId) ?? [];
        if (output.type === OK) {
          ruleResultsForRuleIdMap.push(output.result);
        } else {
          ruleResultsForRuleIdMap.push(...output.result);
        }
        ruleResultsForManifestMap.set(output.ruleId, ruleResultsForRuleIdMap);
        ruleResultMap.set(output.installPath, ruleResultsForManifestMap);
        return new Map(ruleResultMap);
      },
    }),
    assignPackError: assign({
      packError: (_, packError: PackError | PackParseError) => packError,
    }),
    assignInstallError: assign({
      installError: (_, installError: InstallError) => installError,
    }),
    assignError: assign({
      error: ({self, context}, error: Error) => {
        if (isSmokerError(AbortError, error)) {
          return context.error;
        }
        if (context.error) {
          return context.error.clone(error);
        }
        return new MachineError(
          `Package manager encountered an error`,
          error,
          self.id,
        );
      },
    }),
    assignRuleMachineRefs: assign({
      ruleMachineRefs: ({
        self,
        spawn,
        context: {ruleInitPayloads, ruleConfigs},
      }) => {
        return Object.fromEntries(
          ruleInitPayloads.map(({def, id: ruleId}) => {
            assert.ok(ruleId);
            const id = uniqueId({prefix: 'rule', postfix: ruleId});
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
  },
  guards: {
    shouldPruneTempDir: and([
      'hasTempDir',
      'hasContext',
      ({context: {linger}}) => !linger,
    ]),
    shouldLinger: and([
      'hasTempDir',
      'hasContext',
      ({context: {linger}}) => Boolean(linger),
    ]),
    isAborted: ({context: {signal}}) => signal.aborted,
    hasContext: ({context: {ctx}}) => Boolean(ctx),
    hasTempDir: ({context: {tmpdir}}) => Boolean(tmpdir),
    isBootstrapped: and(['hasContext', 'hasTempDir']),
    hasPackJobs: ({context: {packQueue}}) => !isEmpty(packQueue),
    hasInstallJobs: ({context: {installQueue}}) => !isEmpty(installQueue),
    hasRunScriptJobs: ({context: {runScriptQueue}}) => !isEmpty(runScriptQueue),
    hasLintJobs: ({context: {lintQueue}}) => !isEmpty(lintQueue),
    shouldShutdown: ({context: {shouldShutdown}}) => shouldShutdown,
    hasError: ({context: {error}}) => Boolean(error),
    nothingToDo: ({context: {workspaceInfo}}) => isEmpty(workspaceInfo),
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
      not('hasPackJobs'),
      ({context: {installManifests = [], workspaceInfo, additionalDeps}}) =>
        installManifests.length ===
        additionalDeps.length + workspaceInfo.length,
    ]),
    hasRuleDefs: ({context: {ruleDefs}}) => !isEmpty(ruleDefs),
    shouldLint: and(['hasRuleDefs', ({context: {shouldLint}}) => shouldLint]),
    shouldRunScripts: ({context: {scripts}}) => !isEmpty(scripts),
    isLintingComplete: ({
      context: {workspaceInfo, ruleResultMap, ruleDefs = []},
    }) => {
      return (
        ruleResultMap.size === workspaceInfo.length &&
        [...ruleResultMap.values()].every(
          (result) => result.size === ruleDefs.length,
        )
      );
    },
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
    log(
      ({context: {spec}}) => `PkgManagerMachine for ${spec} exiting gracefully`,
    ),
  ],
  entry: [
    log(({context: {spec, workspaceInfo, shouldLint, scripts}}) => {
      let msg = `PkgManagerMachine ${spec} starting up with ${workspaceInfo.length} workspace(s)`;
      if (shouldLint) {
        msg += '; will lint';
      }
      if (!isEmpty(scripts)) {
        msg += '; will run scripts';
      }
      return msg;
    }),
  ],
  initial: 'startup',
  context: ({
    input: {
      spec,
      opts: {loose = false, verbose = false} = {},
      shouldLint = false,
      shouldShutdown = false,
      additionalDeps = [],
      ruleInitPayloads = [],
      workspaceInfo,
      signal,
      ...input
    },
  }) => {
    const abortController = new AbortController();
    return {
      ...input,
      spec,
      signal: AbortSignal.any([signal, abortController.signal]),
      pkgManager: serialize(spec),
      abortController,
      workspaceInfo,
      ruleInitPayloads,
      ruleDefs: ruleInitPayloads.map(({def}) => def),
      opts: {loose, verbose},
      packQueue: [...workspaceInfo],
      installQueue: [],
      runScriptQueue: [],
      lintQueue: [],
      additionalDeps,
      shouldShutdown,
      shouldLint,
      ruleResultMap: new Map(),
    };
  },
  always: [
    {
      guard: and(['hasError', ({context: {signal}}) => !signal.aborted]),
      actions: [
        log(({context: {error}}) => `ERROR: ${error?.message}`),
        ({context: {abortController, signal, error}}) => {
          if (!signal.aborted) {
            abortController.abort(error);
          }
        },
      ],
    },
  ],
  states: {
    startup: {
      initial: 'readyingFilesystem',
      states: {
        readyingFilesystem: {
          entry: [log('creating temp dir')],
          invoke: {
            src: 'createTempDir',
            input: ({context: {signal, fileManager, spec}}) => ({
              spec,
              fileManager,
              signal,
            }),
            onDone: {
              actions: [
                {
                  type: 'assignTmpdir',
                  params: ({event: {output}}) => output,
                },
              ],
              target: 'creatingContext',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({context: {spec}, event: {error}}) =>
                    new TempDirError(
                      `Package manager ${spec.spec} could not create a temp dir`,
                      spec,
                      error as NodeJS.ErrnoException,
                    ),
                },
              ],
              target: 'errored',
            },
          },
        },
        creatingContext: {
          always: {
            actions: {type: 'createPkgManagerContext'},
            target: 'setupLifecycle',
          },
        },
        setupLifecycle: {
          entry: [log('running setup lifecycle hook')],
          tags: [Tag.Lifecycle],
          invoke: {
            src: 'setupPkgManager',
            input: ({context: {def, ctx, signal}}) => {
              assert.ok(ctx);
              return {
                def,
                ctx,
                signal,
              };
            },
            onDone: {
              target: 'done',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}, context: {spec, plugin}}) =>
                    new LifecycleError(
                      fromUnknownError(error),
                      'setup',
                      'pkg-manager',
                      spec.spec,
                      plugin,
                    ),
                },
              ],
              target: 'errored',
            },
          },
        },
        done: {
          type: FINAL,
        },
        errored: {
          tags: [Tag.Error],
          type: FINAL,
        },
      },
      onDone: [
        {
          guard: {type: 'hasError'},
          target: 'shutdown',
        },
        {
          target: 'working',
        },
      ],
    },
    working: {
      description:
        'This is where most things happen. As soon as a pkg is packed, it will be installed. As soon as it is installed, we can lint or run scripts; this all happens in parallel',
      type: PARALLEL,
      // we can start installing additional deps as soon as we have a tmpdir
      entry: [{type: 'enqueueAdditionalDeps'}],
      states: {
        packing: {
          description:
            'Packs chosen workspaces in parallel. The packing queue should be non-empty when entering this state',
          initial: 'idle',
          states: {
            idle: {
              description: 'Short-circuit before PkgManagerPackBegin is sent',
              always: [
                {
                  guard: {type: 'nothingToDo'},
                  actions: [log('nothing to pack!')],
                  target: 'done',
                },
                {
                  target: 'packingPkgs',
                },
              ],
            },
            packingPkgs: {
              entry: [{type: 'sendPkgManagerPackBegin'}],
              exit: [{type: 'sendPkgManagerPackEnd'}],
              always: [
                {
                  description:
                    'Immediately transition to Errored state if an error occurs',
                  guard: {type: 'hasError'},
                  target: 'errored',
                },
                {
                  guard: {type: 'isPackingComplete'},
                  target: 'done',
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
                      type: 'assignPackError',
                      params: ({event: {error}}) => error,
                    },
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
            errored: {
              entry: [log('packing errored')],
              type: FINAL,
              tags: [Tag.Error],
            },
            done: {
              entry: [log('packing complete')],
              type: FINAL,
            },
            aborted: {
              entry: log('packing aborted'),
              type: FINAL,
              tags: [Tag.Aborted],
            },
          },
        },
        installing: {
          description: 'Installs in serial',
          entry: [log('ready to install')],
          initial: 'idle',
          states: {
            idle: {
              always: [
                {
                  guard: {type: 'hasInstallJobs'},
                  target: 'installingPkgs',
                },
                {
                  guard: {type: 'nothingToDo'},
                  actions: [log('nothing to install!')],
                  target: 'done',
                },
              ],
            },
            installingPkgs: {
              entry: [{type: 'sendPkgManagerInstallBegin'}],
              exit: [
                {type: 'sendPkgManagerInstallEnd'},
                {type: 'freeInstallResults'},
              ],
              initial: 'installPkg',
              states: {
                installPkg: {
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
                      context: {
                        def,
                        ctx,
                        signal,
                        currentInstallJob,
                        pkgManager,
                      },
                    }): InstallInput => {
                      assert.ok(currentInstallJob);
                      assert.ok(ctx);

                      return {
                        def,
                        signal,
                        ctx: {...ctx, ...currentInstallJob, signal},
                        spec: pkgManager,
                      };
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
                      target: 'installedPkg',
                    },

                    onError: {
                      actions: [
                        {
                          type: 'assignInstallError',
                          params: ({event: {error}}) => error as InstallError,
                        },
                        {
                          type: 'sendPkgInstallFailed',
                          params: ({event: {error}}) => error as InstallError,
                        },
                        {
                          type: 'assignError',
                          params: ({event: {error}}) => error as InstallError,
                        },
                      ],
                      target: 'errored',
                    },
                  },
                },
                installedPkg: {
                  always: [
                    {
                      guard: {type: 'hasError'},
                      target: 'errored',
                    },
                    {
                      guard: {type: 'hasInstallJobs'},
                      target: 'installPkg',
                    },
                    {
                      guard: {type: 'isInstallationComplete'},
                      target: 'done',
                    },
                  ],
                },
                done: {
                  type: FINAL,
                },
                errored: {
                  tags: [Tag.Error],
                  type: FINAL,
                },
              },
              onDone: {
                target: 'done',
              },
            },
            done: {
              entry: [log('installation complete')],
              type: FINAL,
            },
            errored: {
              entry: [log('installation errored')],
              tags: [Tag.Error],
              type: FINAL,
            },
            aborted: {
              entry: log('installation aborted'),
              type: FINAL,
              tags: [Tag.Aborted],
            },
          },
        },
        runningScripts: {
          initial: 'idle',
          states: {
            idle: {
              description:
                'A list of scripts should be provided within the machine input; if it is empty, we can exit early',
              always: [
                {
                  guard: {type: 'shouldRunScripts'},
                  target: 'running',
                },
                {
                  guard: not('shouldRunScripts'),
                  target: 'done',
                  actions: [log('no custom scripts to run')],
                },
              ],
            },
            running: {
              entry: [{type: 'sendPkgManagerRunScriptsBegin'}],
              always: [
                {
                  guard: {type: 'hasError'},
                  target: 'errored',
                },
                {
                  guard: {type: 'isRunningComplete'},
                  target: 'done',
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
                      }),
                    },
                  ],
                },
                'xstate.done.actor.runScript.*': [
                  {
                    guard: ({event: {output}}) => output.result.type === ERROR,
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
                      {
                        type: 'assignError',
                        params: ({
                          event: {
                            output: {result},
                          },
                        }) => {
                          assert.ok(result.type === ERROR);
                          return result.error;
                        },
                      },
                    ],
                    target: 'errored',
                  },
                  {
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
                ],
                'xstate.error.actor.runScript.*': {
                  description: 'This is unlikely',
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => error,
                    },
                  ],
                  target: 'errored',
                },
              },
            },
            aborted: {
              entry: log('script run aborted'),
              type: FINAL,
              tags: [Tag.Aborted],
            },
            errored: {
              entry: log('script run errored'),
              type: FINAL,
              tags: [Tag.Error],
            },
            done: {
              entry: log('script run complete'),
              type: FINAL,
            },
          },
        },
        linting: {
          initial: 'idle',
          on: {
            LINT: {
              actions: [
                {
                  type: 'appendLintManifest',
                  params: ({event: {manifest}}) => manifest,
                },
                {
                  type: 'enqueueLintItem',
                  params: ({event: {manifest}}) => manifest,
                },
              ],
            },
            CHECK_RESULT: {
              description:
                'Once a RuleMachine has completed a rule check, it will send this event',
              actions: [
                log(
                  ({
                    event: {
                      output: {
                        ruleId,
                        manifest: {pkgName},
                      },
                    },
                  }) => `ran rule ${ruleId} on ${pkgName}`,
                ),
                {
                  type: 'updateRuleResultMap',
                  params: ({event: {output}}) => output,
                },
                {
                  type: 'sendRuleEnd',
                  params: ({event}) => ({
                    ...event.output,
                    config: event.config,
                  }),
                },
              ],
            },
          },
          states: {
            idle: {
              description:
                'If the `lint` flag was not passed into the Smoker options, we can exit early',
              always: [
                {
                  guard: and(['shouldLint', 'hasLintJobs']),
                  target: 'lintingPkgs',
                },
                {
                  guard: not('shouldLint'),
                  actions: log('no linting to do'),
                  target: 'done',
                },
              ],
            },
            // TODO error handling
            lintingPkgs: {
              entry: [
                {type: 'sendPkgManagerLintBegin'},
                {type: 'assignRuleMachineRefs'},
              ],
              always: [
                {
                  guard: {type: 'hasLintJobs'},
                  actions: [{type: 'drainLintQueue'}],
                },
                {
                  guard: {type: 'isLintingComplete'},
                  target: 'done',
                },
              ],
              exit: [
                {type: 'sendPkgManagerLintEnd'},
                {type: 'freeRuleResultMap'},
                {type: 'freeRuleMachineRefs'},
              ],
            },
            done: {
              entry: log('linting complete'),
              type: FINAL,
            },
            errored: {
              entry: log('linting errored'),
              type: FINAL,
              tags: [Tag.Error],
            },
            aborted: {
              entry: log('linting aborted'),
              type: FINAL,
              tags: [Tag.Aborted],
            },
          },
        },
      },
      onDone: [
        {
          guard: {type: 'shouldShutdown'},
          target: 'shutdown',
          actions: [log('shutting down')],
        },
      ],
    },
    shutdown: {
      initial: 'idle',
      states: {
        idle: {
          always: [
            {
              guard: {type: 'shouldPruneTempDir'},
              target: 'cleanupFilesystem',
              actions: [
                log(({context: {tmpdir}}) => `will destroy temp dir ${tmpdir}`),
              ],
            },
            {
              guard: {type: 'shouldLinger'},
              target: 'teardownLifecycle',
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
            {
              guard: {type: 'hasContext'},
              target: 'teardownLifecycle',
            },
            {
              target: 'done',
            },
          ],
        },
        cleanupFilesystem: {
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
              actions: [
                log(({context: {tmpdir}}) => `BLASTED temp dir ${tmpdir}`),
              ],
              target: 'teardownLifecycle',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => fromUnknownError(error),
                },
              ],
              target: 'teardownLifecycle',
            },
          },
        },
        teardownLifecycle: {
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
              target: 'done',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}, context: {spec, plugin}}) =>
                    new LifecycleError(
                      fromUnknownError(error),
                      'teardown',
                      'pkg-manager',
                      spec.spec,
                      plugin,
                    ),
                },
              ],
              target: 'errored',
            },
          },
        },
        done: {
          type: FINAL,
        },
        errored: {
          tags: [Tag.Error],
          type: FINAL,
        },
      },
      onDone: {
        target: 'done',
      },
    },
    done: {
      type: FINAL,
    },
  },
  output: ({context: {error}, self: {id}}): PkgManagerMachineOutput =>
    error ? {type: ERROR, error, id} : {type: OK, id},
});
