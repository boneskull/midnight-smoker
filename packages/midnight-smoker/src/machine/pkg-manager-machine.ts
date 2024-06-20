import {ERROR, FAILED, FINAL, OK, PARALLEL, SKIPPED} from '#constants';
import {CleanupError} from '#error/cleanup-error';
import {type InstallError} from '#error/install-error';
import {LifecycleError} from '#error/lifecycle-error';
import {MachineError} from '#error/machine-error';
import {type PackError} from '#error/pack-error';
import {type PackParseError} from '#error/pack-parse-error';
import {type RuleError} from '#error/rule-error';
import {type SomePackError} from '#error/some-pack-error';
import {TempDirError} from '#error/temp-dir-error';
import {type Executor} from '#executor';
import {
  install,
  pack,
  runScript,
  type InstallInput,
  type RunScriptOutput,
} from '#machine/actor/operations';
import {
  setupPkgManager,
  teardownPkgManager,
} from '#machine/actor/pkg-manager-lifecycle';
import {
  prepareLintManifest,
  type PrepareLintManifestInput,
} from '#machine/actor/prepare-lint-manifest';
import {createTempDir, pruneTempDir} from '#machine/actor/temp-dir';
import {type AbortEvent} from '#machine/event/abort';
import type * as InstallEvents from '#machine/event/install';
import type * as LintEvents from '#machine/event/lint';
import type * as PackEvents from '#machine/event/pack';
import type * as ScriptEvents from '#machine/event/script';
import {
  type SmokeMachineEvent,
  type SmokeMachineLingeredEvent,
} from '#machine/event/smoke';
import {type RuleInitPayload} from '#machine/payload';
import {RuleMachine} from '#machine/rule-machine';
import {
  idFromEventType,
  type ActorOutputError,
  type ActorOutputOk,
} from '#machine/util';
import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import type * as Schema from '#schema/meta/for-pkg-manager-machine';
import {fromUnknownError} from '#util/error-util';
import {type FileManager} from '#util/filemanager';
import {asResult, type Result} from '#util/result';
import {serialize} from '#util/serialize';
import {uniqueId} from '#util/unique-id';
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
  type ActorRef,
  type ActorRefFrom,
  type Snapshot,
} from 'xstate';
import {type CheckOutput, type CheckOutputError} from './rule-machine';

export type PkgManagerMachineEvent =
  | PkgManagerMachinePackDoneEvent
  | PkgManagerMachinePackErrorEvent
  | PkgManagerMachineHaltEvent
  | PkgManagerMachineRunScriptDoneEvent
  | PkgManagerMachineLintEvent
  | PkgManagerMachineRunScriptEvent
  | PkgManagerMachineCheckResultEvent
  | PkgManagerMachineRunScriptErrorEvent
  | PkgManagerMachineRuleEndEvent
  | PkgManagerMachineCheckErrorEvent
  | PkgManagerMachinePrepareLintManifestDoneEvent
  | PkgManagerMachinePrepareLintManifestErrorEvent
  | PkgManagerMachineBeginEvent
  | AbortEvent;

export type PkgManagerMachineOutput =
  | ActorOutputOk<{aborted: false}>
  | PkgManagerMachineOutputError;

export type PkgManagerMachineOutputError = ActorOutputError<
  MachineError,
  {aborted?: boolean}
>;

export interface PkgManagerMachineCheckErrorEvent {
  output: CheckOutputError;
  type: 'CHECK_ERROR';
}

export interface PkgManagerMachineCheckResultEvent {
  output: CheckOutput;
  type: 'CHECK_RESULT';
}

export interface PkgManagerMachineContext extends PkgManagerMachineInput {
  /**
   * Whether or not the machine has aborted
   */
  aborted?: boolean;

  /**
   * Additional dependencies; defaults to empty array
   */
  additionalDeps: string[];

  /**
   * The base {@link Schema.PkgManagerContext} object for passing to the
   * {@link PackageManagerDef}'s operations
   */
  ctx?: Schema.PkgManagerContext;

  /**
   * The current install job. Installations run in serial
   */
  currentInstallJob?: Schema.InstallManifest;

  /**
   * Aggregate error object for any error occuring in this machine
   */
  error?: MachineError;

  /**
   * Install-specific error.
   *
   * Only used for tracking if the operation failed; can be freed after the
   * `installing` state is done
   */
  installError?: InstallError;

  /**
   * Objects telling the {@link Schema.PkgManagerDef} what to install.
   *
   * Also sent/emitted within events.
   */
  installManifests?: Schema.InstallManifest[];

  /**
   * Queue of {@link Schema.InstallManifest}s to install.
   */
  installQueue?: Schema.InstallManifest[];

  /**
   * Results of installation operations
   */
  installResults?: Schema.InstallResult[];

  /**
   * Objects telling the {@link Schema.PkgManagerDef} what to lint
   */
  lintManifests?: Schema.LintManifest[];

  /**
   * Queue of {@link Schema.LintManifest}s to lint
   */
  lintQueue?: Schema.LintManifest[];

  /**
   * Options for package manager behavior.
   *
   * Props will be included in {@link ctx}.
   */
  opts: Schema.PkgManagerOpts;

  /**
   * References to {@link pack} actors.
   *
   * References are kept so that they can be aborted if necessary. **Any error
   * thrown from a {@link pack pack actor} should cause the machine to abort**.
   */
  packActorRefs?: Record<string, ActorRefFrom<typeof pack>>;

  /**
   * Pack-specific error.
   *
   * Only used for tracking if the operation failed; can be freed after the
   * `packing` state is done
   */
  packError?: SomePackError;

  /**
   * Queue of {@link Schema.WorkspaceInfo} objects to pack.
   */
  packQueue: Schema.WorkspaceInfo[];

  /**
   * The static representation of {@link PkgManagerInput.spec}.
   *
   * Just here for convenience, since many events will need this information.
   */
  pkgManager: Schema.StaticPkgManagerSpec;
  prepareLintManifestRefs?: Record<
    string,
    ActorRefFrom<typeof prepareLintManifest>
  >;

  /**
   * List of {@link Schema.SomeRuleDef} objects derived from
   * {@link ruleInitPayload}
   *
   * Needed by `linting` state.
   */
  ruleDefs?: Schema.SomeRuleDef[];
  ruleErrors?: RuleError[];

  /**
   * Information about rules and the plugins to which they belong
   */
  ruleInitPayloads: RuleInitPayload[];

  /**
   * References to {@link RuleMachine} actors; one per item in {@link ruleDefs}.
   *
   * These actors can stay alive during the `linting` state and be freed
   * thereafter.
   */
  ruleMachineRefs?: Record<string, ActorRefFrom<typeof RuleMachine>>;

  /**
   * Mapping of `installPath` to `ruleId` to {@link Schema.CheckResult} objects.
   *
   * @todo Consider a different data structure. Maybe key on
   *   `${installPath}.${ruleId}`? Nested object?
   */
  ruleResultMap: Map<string, Map<string, Schema.CheckResult[]>>;
  runScriptActorRefs: Record<string, ActorRefFrom<typeof runScript>>;

  /**
   * Objects telling the {@link Schema.PkgManagerDef} what scripts to run and
   * where
   */
  runScriptManifests?: Schema.RunScriptManifest[];

  /**
   * Queue of {@link Schema.RunScriptManifest}s to run
   */
  runScriptQueue?: Schema.RunScriptManifest[];

  /**
   * Results of script operations; each object contains an event-ready
   * {@link Schema.RunScriptManifest}.
   */
  runScriptResults?: Schema.RunScriptResult[];

  /**
   * {@inheritDoc PkgManagerMachineInput.shouldLint}
   */
  shouldLint: boolean;

  /**
   * {@inheritDoc PkgManagerMachineInput.shouldShutdown}
   */
  shouldShutdown: boolean;

  /**
   * Per-{@link Schema.PkgManagerDef} temporary directory.
   *
   * Will be property of {@link ctx}.
   *
   * Will be pruned during teardown, assuming {@link linger} isn't truthy.
   */
  tmpdir?: string;

  /**
   * Static, event-ready view of {@link workspaceInfo}.
   */
  workspaceInfoResult: Result<Schema.WorkspaceInfo>[];
}

export interface PkgManagerMachineHaltEvent {
  type: 'HALT';
}

export interface PkgManagerMachineInput {
  /**
   * Additional dependencies
   *
   * Corresponds to `SmokerOptions.add`
   */
  additionalDeps?: string[];

  /**
   * Package manager definition provided by a plugin
   */
  def: Schema.PkgManagerDef;

  /**
   * The executor to pass to the package manager's functions
   */
  executor: Executor;

  /**
   * File manager instance for interacting with filesystem
   */
  fileManager: FileManager;

  /**
   * If `true`, the temp dir should not be pruned.
   *
   * Will cause the `Lingered` event to be emitted.
   *
   * Corresponds to `SmokerOptions.linger`
   */
  linger?: boolean;

  /**
   * Options for the package manager
   */
  opts?: Schema.PkgManagerOpts;

  /**
   * The parent actor reference.
   *
   * Most events are sent to it.
   */
  parentRef: ActorRef<Snapshot<unknown>, SmokeMachineEvent>;

  /**
   * The metadata for the plugin to which {@link PkgManagerMachineInput.def}
   * belongs
   */
  plugin: Schema.StaticPluginMetadata;

  /**
   * Record of rule IDs to rule configs (options, severity)
   *
   * Corresponds to `SmokerOptions.rules`
   */
  ruleConfigs: Schema.BaseRuleConfigRecord;

  /**
   * Array of rules to run with plugin information.
   *
   * These rules can come from any plugin.
   */
  ruleInitPayloads?: RuleInitPayload[];

  /**
   * Custom scripts to run
   *
   * Corresponds to `SmokerOptions.script`
   */
  scripts?: string[];

  /**
   * Whether or not linting should be performed.
   *
   * Linting also requires {@link ruleDefs} to be non-empty.
   */
  shouldLint?: boolean;

  /**
   * Whether or not the machine should shutdown after completion of its tasks.
   */
  shouldShutdown?: boolean;

  /**
   * The package manager specification for {@link Schema.PkgManagerDef}.
   *
   * Represents the specific version of the package manager being used.
   */
  spec: PkgManagerSpec;

  /**
   * If `true`, use workspaces; expect that the current directory is a monorepo.
   */
  useWorkspaces: boolean;

  /**
   * Information about one or more workspaces.
   *
   * If this contains a single item, then we either have one workspace _or_ are
   * not in a monorepo.
   */
  workspaceInfo: Schema.WorkspaceInfo[];

  /**
   * If `true`, run in "immediate" mode; do not wait for
   * {@link PkgManagerMachineBeginEvent}
   */
  immediate?: boolean;
}

/**
 * When {@link PkgManagerMachineInput.immediate} is falsy, the receipt of this
 * event will start the packing process.
 *
 * @event
 */
export interface PkgManagerMachineBeginEvent {
  type: 'BEGIN';
}

/**
 * Received when the {@link PkgManagerMachine} should enqueue a workspace for
 * linting.
 *
 * @event
 */
export interface PkgManagerMachineLintEvent {
  installPath: string;
  type: 'LINT';
  workspaceInfo: Schema.WorkspaceInfo;
}

/**
 * Received when the {@link pack "pack" Promise actor} has completed
 * successfully.
 *
 * @event
 */
export interface PkgManagerMachinePackDoneEvent {
  output: Schema.InstallManifest;
  type: 'xstate.done.actor.pack.*';
}

/**
 * Received when the {@link pack "pack" Promise actor} has completed with error.
 *
 * **Note**: This should cause the machine to abort.
 *
 * @event
 */
export interface PkgManagerMachinePackErrorEvent {
  error: PackError | PackParseError;
  type: 'xstate.error.actor.pack.*';
}

export interface PkgManagerMachinePrepareLintManifestDoneEvent {
  output: Schema.LintManifest;
  type: 'xstate.done.actor.prepareLintManifest.*';
}

export interface PkgManagerMachinePrepareLintManifestErrorEvent {
  error: Error;
  type: 'xstate.error.actor.prepareLintManifest.*';
}

export interface PkgManagerMachineRuleEndEvent {
  config: Schema.SomeRuleConfig;
  output: CheckOutput;
  type: 'RULE_END';
}

export interface PkgManagerMachineRunScriptDoneEvent {
  output: RunScriptOutput;
  type: 'xstate.done.actor.runScript.*';
}

export interface PkgManagerMachineRunScriptErrorEvent {
  error: Schema.ScriptError;
  type: 'xstate.error.actor.runScript.*';
}

export interface PkgManagerMachineRunScriptEvent {
  manifest: Schema.RunScriptManifest;
  type: 'RUN_SCRIPT';
}

/**
 * Type guard for an {@link Schema.InstallManifest} which originated in a
 * workspace (in other words, _not_ an additional dependency)
 *
 * @param value Install manifest to check
 * @returns `true` if `value` is a workspace manifest
 */
function isWorkspaceManifest(
  value: Schema.InstallManifest,
): value is Schema.InstallManifest &
  Schema.WorkspaceInfo & {
    installPath: string;
    isAdditional?: false;
  } {
  return Boolean(value.installPath && value.localPath && !value.isAdditional);
}

/**
 * Machine which controls how a {@link Schema.PkgManagerDef} performs its
 * operations.
 */
export const PkgManagerMachine = setup({
  actions: {
    aborted: assign({aborted: true}),
    abort: raise({type: 'ABORT'}),
    stopAllChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      for (const child of Object.keys(snapshot.children)) {
        enqueue.stopChild(child);
      }
    }),
    sendLingered: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): SmokeMachineLingeredEvent => {
        const {tmpdir} = context;
        assert.ok(tmpdir);
        return {
          type: 'LINGERED',
          directory: tmpdir,
        };
      },
    ),

    /**
     * This sends the `RuleEnd` event as well as the appropriate `RuleOk`,
     * `RuleFailed`, or `RuleError` event
     */
    sendRuleEnd: enqueueActions(
      (
        {enqueue, self: {id: sender}, context: {parentRef, pkgManager}},
        input: CheckOutput | CheckOutputError,
      ) => {
        if (input.type === ERROR) {
          const {ruleId: rule, ...output} = input;
          const evt: LintEvents.SmokeMachineRuleErrorEvent = {
            ...output,
            pkgManager,
            rule,
            sender,
            type: 'LINT.RULE_ERROR',
          };
          enqueue.sendTo(parentRef, evt);
        } else {
          const {ruleId: rule, type, result, ...output} = input;
          const specificRuleEndEvent:
            | LintEvents.SmokeMachineRuleOkEvent
            | LintEvents.SmokeMachineRuleFailedEvent =
            type === OK
              ? {
                  result,
                  ...output,
                  pkgManager,
                  rule,
                  sender,
                  type: 'LINT.RULE_OK',
                }
              : {
                  result,
                  ...output,
                  pkgManager,
                  rule,
                  sender,
                  type: 'LINT.RULE_FAILED',
                };
          enqueue.sendTo(parentRef, specificRuleEndEvent);
        }
        const {ruleId: rule, type: _, ...output} = input;
        const ruleEndEvent: LintEvents.SmokeMachineRuleEndEvent = {
          ...output,
          pkgManager,
          rule,
          sender,
          type: 'LINT.RULE_END',
        };
        enqueue.sendTo(parentRef, ruleEndEvent);
      },
    ),

    /**
     * The only reason we keep this around at all is so that the
     * `isInstallationComplete` guard has something to compare against.
     */
    appendInstallResult: assign({
      installResults: (
        {context: {installResults = []}},
        installResult: Schema.InstallResult,
      ) => [...installResults, installResult],
    }),
    appendRunScriptManifest: assign({
      runScriptManifests: (
        {context: {runScriptManifests = []}},
        runScriptManifest: Schema.RunScriptManifest,
      ) => [...runScriptManifests, runScriptManifest],
      runScriptQueue: (
        {context: {runScriptQueue = []}},
        runScriptManifest: Schema.RunScriptManifest,
      ) => [...runScriptQueue, runScriptManifest],
    }),
    appendLintManifest: assign({
      lintManifests: (
        {context: {lintManifests = []}},
        lintManifest: Schema.LintManifest,
      ) => [...lintManifests, lintManifest],
      lintQueue: (
        {context: {lintQueue = []}},
        lintItem: Schema.LintManifest,
      ) => [...lintQueue, lintItem],
    }),
    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: Schema.RunScriptResult,
      ) => [...runScriptResults, runScriptResult],
    }),
    createPkgManagerContext: assign({
      ctx: ({
        context: {spec, tmpdir, executor, workspaceInfo, useWorkspaces, opts},
      }): Schema.PkgManagerContext => {
        assert.ok(tmpdir);
        return {
          spec,
          tmpdir,
          executor,
          workspaceInfo,
          useWorkspaces,
          ...opts,
        };
      },
    }),
    shutdown: assign({
      shouldShutdown: true,
    }),
    sendPkgManagerPackBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self,
        context: {workspaceInfoResult, pkgManager},
      }): PackEvents.SmokeMachinePkgManagerPackBeginEvent => {
        return {
          sender: self.id,
          type: 'PACK.PKG_MANAGER_PACK_BEGIN',
          pkgManager,
          workspaceInfo: workspaceInfoResult,
        };
      },
    ),
    sendPkgManagerPackEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id},
        context: {
          packError: error,
          installManifests = [],
          workspaceInfoResult,
          pkgManager,
        },
      }):
        | PackEvents.SmokeMachinePkgManagerPackOkEvent
        | PackEvents.SmokeMachinePkgManagerPackFailedEvent => {
        const data = {
          workspaceInfo: workspaceInfoResult,
          pkgManager,
          sender: id,
        };
        return error
          ? {
              type: 'PACK.PKG_MANAGER_PACK_FAILED',
              error,
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
        context: {pkgManager, installManifests = [], workspaceInfoResult},
      }): InstallEvents.SmokeMachinePkgManagerInstallBeginEvent => ({
        manifests: installManifests,
        sender: self.id,
        type: 'INSTALL.PKG_MANAGER_INSTALL_BEGIN',
        pkgManager,
        workspaceInfo: workspaceInfoResult,
      }),
    ),
    sendPkgManagerInstallEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context: {
          installManifests = [],
          pkgManager,
          installError,
          workspaceInfoResult,
        },
      }):
        | InstallEvents.SmokeMachinePkgManagerInstallOkEvent
        | InstallEvents.SmokeMachinePkgManagerInstallFailedEvent => {
        const baseEventData = {
          workspaceInfo: workspaceInfoResult,
          manifests: installManifests,
          pkgManager,
          sender,
        };
        return installError
          ? {
              ...baseEventData,
              type: 'INSTALL.PKG_MANAGER_INSTALL_FAILED',
              error: installError,
            }
          : {
              ...baseEventData,
              type: 'INSTALL.PKG_MANAGER_INSTALL_OK',
            };
      },
    ),
    sendRunScriptEnd: enqueueActions(
      (
        {enqueue, self: {id: sender}, context: {pkgManager, parentRef}},
        {result, manifest}: RunScriptOutput,
      ) => {
        const baseEventData = {
          pkgManager,
          manifest,
          sender,
        };
        let evt: ScriptEvents.SomeSmokeMachineRunScriptEndEvent;
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

        const evtEnd: ScriptEvents.SmokeMachineRunScriptEndEvent = {
          ...evt,
          type: 'SCRIPT.RUN_SCRIPT_END',
        };
        enqueue.sendTo(parentRef, evtEnd);
      },
    ),
    spawnPrepareLintManifest: assign({
      prepareLintManifestRefs: (
        {
          spawn,
          context: {
            fileManager,
            pkgManager: {spec},
            prepareLintManifestRefs = {},
          },
        },
        {
          workspaceInfo: workspace,
          installPath,
        }: {workspaceInfo: Schema.WorkspaceInfo; installPath: string},
      ) => {
        const input: PrepareLintManifestInput = {
          fileManager,
          workspace,
          installPath,
        };
        const id = `prepareLintManifest.[${installPath}]<${spec}>`;
        const ref = spawn('prepareLintManifest', {
          id,
          input,
        });
        return {...prepareLintManifestRefs, [id]: ref};
      },
    }),
    stopPrepareLintManifest: enqueueActions(
      ({enqueue, context: {prepareLintManifestRefs = {}}}, id: string) => {
        enqueue.stopChild(id);

        const {[id]: _, ...rest} = prepareLintManifestRefs;
        enqueue.assign({prepareLintManifestRefs: rest});
      },
    ),
    spawnRunScript: assign({
      runScriptActorRefs: ({
        spawn,
        context: {
          def,
          ctx,
          runScriptActorRefs,
          runScriptQueue = [],
          pkgManager,
          scripts,
        },
      }) => {
        assert.ok(!isEmpty(runScriptQueue));
        assert.ok(!isEmpty(scripts));
        assert.ok(ctx);

        const queue = [...runScriptQueue];
        const manifest = queue.shift();
        assert.ok(manifest);
        const id = uniqueId({
          prefix: 'runScript',
          postfix: manifest.pkgName,
        });
        const ref = spawn('runScript', {
          id,
          input: {
            def,
            ctx: {
              manifest,
              ...ctx,
            },
            spec: pkgManager,
          },
        });
        return {...runScriptActorRefs, [id]: ref};
      },
    }),
    sendRunScriptBegin: enqueueActions(
      ({
        enqueue,
        self: {id: sender},
        context: {runScriptQueue = [], pkgManager, scripts, ctx, parentRef},
      }) => {
        assert.ok(!isEmpty(runScriptQueue));
        assert.ok(!isEmpty(scripts));
        assert.ok(ctx);

        const queue = [...runScriptQueue];
        const manifest = queue.shift();
        assert.ok(manifest);
        const evt: ScriptEvents.SmokeMachineRunScriptBeginEvent = {
          type: 'SCRIPT.RUN_SCRIPT_BEGIN',
          pkgManager,
          manifest,
          sender,
        };
        enqueue.sendTo(parentRef, evt);
        enqueue.assign({
          runScriptQueue: queue,
        });
      },
    ),
    pkgPackBegin: enqueueActions(
      ({
        self: {id: sender},
        enqueue,
        context: {ctx, pkgManager, packQueue, parentRef},
      }) => {
        assert.ok(ctx);
        const queue = [...packQueue];
        const workspace = queue.shift();
        assert.ok(workspace);
        const evt: PackEvents.SmokeMachinePkgPackBeginEvent = {
          sender,
          type: 'PACK.PKG_PACK_BEGIN',
          pkgManager,
          workspace: asResult(workspace),
        };
        enqueue.sendTo(parentRef, evt);
        enqueue.assign({packQueue: queue});
      },
    ),
    spawnPackActor: assign({
      packActorRefs: ({
        spawn,
        context: {packActorRefs = {}, packQueue, ctx, def, pkgManager},
      }) => {
        const workspace = head(packQueue);
        assert.ok(workspace);
        assert.ok(ctx);
        const id = uniqueId({prefix: 'pack', postfix: workspace.pkgName});
        const ref = spawn('pack', {
          id,
          input: {
            def,
            ctx: {
              ...ctx,
              ...workspace,
            },
            spec: pkgManager,
          },
        });
        return {...packActorRefs, [id]: ref};
      },
    }),
    stopPackActor: enqueueActions(
      ({enqueue, context: {packActorRefs = {}}}, id: string) => {
        enqueue.stopChild(id);

        const {[id]: _, ...rest} = packActorRefs;
        enqueue.assign({packActorRefs: rest});
      },
    ),
    sendPkgPackOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context: {pkgManager}},
        installManifest: Schema.InstallManifest,
      ): PackEvents.SmokeMachinePkgPackOkEvent => {
        assert.ok(isWorkspaceManifest(installManifest));
        const workspace = {
          localPath: installManifest.localPath,
          pkgName: installManifest.pkgName,
          pkgJson: installManifest.pkgJson,
          pkgJsonPath: installManifest.pkgJsonPath,
        } as Schema.WorkspaceInfo;
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
        context: {pkgManager, runScriptManifests = [], workspaceInfoResult},
      }): ScriptEvents.SmokeMachinePkgManagerRunScriptsBeginEvent => ({
        workspaceInfo: workspaceInfoResult,
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
          workspaceInfoResult,
          pkgManager,
        },
      }):
        | ScriptEvents.SmokeMachinePkgManagerRunScriptsOkEvent
        | ScriptEvents.SmokeMachinePkgManagerRunScriptsFailedEvent => {
        const type = runScriptResults?.some(
          (r) => r.type === ERROR || r.type === FAILED,
        )
          ? 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED'
          : 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK';
        return {
          sender,
          type,
          workspaceInfo: workspaceInfoResult,
          pkgManager,
          results: runScriptResults,
          manifests: runScriptManifests,
        };
      },
    ),

    lint: enqueueActions(
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
        const manifest = queue.shift();
        assert.ok(manifest);
        for (const {id: ruleId} of ruleInitPayloads) {
          assert.ok(ruleId);
          const config = ruleConfigs[ruleId];
          const evt: LintEvents.SmokeMachineRuleBeginEvent = {
            sender,
            type: 'LINT.RULE_BEGIN',
            manifest: {
              ...asResult(manifest),
              workspace: asResult(manifest.workspace),
            },
            rule: ruleId,
            config,
            pkgManager,
          };
          enqueue.sendTo(parentRef, evt);

          const ref = ruleMachineRefs[ruleId];
          assert.ok(ref);

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
        enqueue.assign({
          lintQueue: queue,
        });
      },
    ),
    appendInstallManifest: assign({
      installManifests: (
        {context: {installManifests = []}},
        installManifest: Schema.InstallManifest,
      ) => [...installManifests, installManifest],
      installQueue: (
        {context: {installQueue = []}},
        installManifest: Schema.InstallManifest,
      ) => [...installQueue, installManifest],
    }),
    assignTmpdir: assign({
      tmpdir: (_, tmpdir: string) => tmpdir,
    }),
    handleInstallResult: enqueueActions(
      (
        {enqueue, context: {workspaceInfo, shouldLint, scripts = []}},
        installResult: Schema.InstallResult,
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
            enqueue.raise({
              type: 'LINT',
              installPath,
              workspaceInfo: workspace,
            });
          }
          for (const script of scripts) {
            const runScriptManifest: Schema.RunScriptManifest = {
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
        {installManifest, rawResult}: Schema.InstallResult,
      ): InstallEvents.SmokeMachinePkgInstallOkEvent => ({
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
        context: {pkgManager, workspaceInfoResult},
      }): LintEvents.SmokeMachinePkgManagerLintBeginEvent => {
        return {
          type: 'LINT.PKG_MANAGER_LINT_BEGIN',
          pkgManager,
          workspaceInfo: workspaceInfoResult,
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
          workspaceInfoResult,
        },
      }):
        | LintEvents.SmokeMachinePkgManagerLintOkEvent
        | LintEvents.SmokeMachinePkgManagerLintFailedEvent => {
        let hasIssues = false;

        const manifestsByInstallPath = keyBy(lintManifests, 'installPath');

        // turn the ugly map into `LintResult`
        const lintResults: Schema.LintResult[] = [
          ...ruleResultMap.entries(),
        ].map(([installPath, resultMap]) => {
          const results = [...resultMap.values()].flat();
          const [okResults, failedResults] = partition(
            results,
            (r) => r.type === OK,
          );
          hasIssues = hasIssues || Boolean(failedResults.length);

          const manifest = asResult(manifestsByInstallPath[installPath]);
          assert.ok(manifest);

          const retval = failedResults.length
            ? <Schema.LintResultFailed>{
                ...manifest,
                type: FAILED,
                results,
              }
            : <Schema.LintResultOk>{
                ...manifest,
                type: OK,
                results: okResults,
              };

          return retval;
        });

        return error || hasIssues
          ? {
              type: 'LINT.PKG_MANAGER_LINT_FAILED',
              pkgManager,
              sender,
              workspaceInfo: workspaceInfoResult,
              results: lintResults,
            }
          : {
              type: 'LINT.PKG_MANAGER_LINT_OK',
              pkgManager,
              results: lintResults,
              workspaceInfo: workspaceInfoResult,
              sender,
            };
      },
    ),

    /**
     * Creates install manifests for each additional dep and appends them as
     * {@link Schema.InstallManifest}s to the install queue
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
          cwd: tmpdir,
          pkgSpec: dep,
          pkgName: dep,
          isAdditional: true,
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
      }): InstallEvents.SmokeMachinePkgInstallBeginEvent => {
        assert.ok(currentInstallJob);
        return {
          type: 'INSTALL.PKG_INSTALL_BEGIN',
          installManifest: currentInstallJob,
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
      ): InstallEvents.SmokeMachinePkgInstallFailedEvent => {
        assert.ok(currentInstallJob);
        return {
          installManifest: currentInstallJob,
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
        {error}: {error: PackError | PackParseError},
      ): PackEvents.SmokeMachinePkgPackFailedEvent => ({
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
    freeInstallError: assign({
      installError: undefined,
    }),
    freePackError: assign({
      packError: undefined,
    }),
    freeRuleData: enqueueActions(
      ({enqueue, context: {ruleMachineRefs = {}}}) => {
        for (const ref of Object.values(ruleMachineRefs)) {
          enqueue.stopChild(ref);
        }
        enqueue.assign({
          ruleMachineRefs: undefined,
        });
        enqueue.assign({
          ruleResultMap: new Map(),
        });
      },
    ),
    updateRuleResultMap: assign({
      ruleResultMap: (
        {context: {ruleResultMap}},
        {installPath, type, result, ruleId}: CheckOutput,
      ) => {
        // ☠️
        const ruleResultsForManifestMap =
          ruleResultMap.get(installPath) ??
          new Map<string, Schema.CheckResult[]>();
        const ruleResultsForRuleIdMap =
          ruleResultsForManifestMap.get(ruleId) ?? [];
        if (type === OK) {
          ruleResultsForRuleIdMap.push(result);
        } else {
          ruleResultsForRuleIdMap.push(...result);
        }
        ruleResultsForManifestMap.set(ruleId, ruleResultsForRuleIdMap);
        ruleResultMap.set(installPath, ruleResultsForManifestMap);
        return new Map(ruleResultMap);
      },
    }),
    assignRuleError: enqueueActions(
      ({enqueue, context: {ruleErrors = []}}, ruleError: RuleError) => {
        enqueue.assign({ruleErrors: [...ruleErrors, ruleError]});
        // @ts-expect-error xstate/TS limitation
        enqueue({type: 'assignError', params: {error: ruleError}});
      },
    ),
    assignPackError: enqueueActions(
      ({enqueue}, {error}: {error: SomePackError}) => {
        enqueue.assign({packError: error});
        // @ts-expect-error xstate/TS limitation
        enqueue({type: 'assignError', params: {error}});
      },
    ),
    assignInstallError: enqueueActions(
      ({enqueue}, installError: InstallError) => {
        enqueue.assign({installError});
        // @ts-expect-error xstate/TS limitation
        enqueue({type: 'assignError', params: {error: installError}});
      },
    ),
    assignError: assign({
      error: ({self, context}, {error: err}: {error: unknown}) => {
        const error = fromUnknownError(err);
        if (context.error) {
          // this is fairly rare. afaict it only happens
          // when both the teardown and pruneTempDir actors fail
          return context.error.cloneWith(error);
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
      }) =>
        Object.fromEntries(
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
        ),
    }),
  },
  actors: {
    RuleMachine,
    prepareLintManifest,
    teardownPkgManager,
    setupPkgManager,
    createTempDir,
    runScript,
    pack,
    pruneTempDir,
    install,
  },
  guards: {
    isImmediateMode: ({context: {immediate}}) => Boolean(immediate),
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
    hasContext: ({context: {ctx}}) => Boolean(ctx),
    hasTempDir: ({context: {tmpdir}}) => Boolean(tmpdir),
    isBootstrapped: and(['hasContext', 'hasTempDir']),
    hasPackJobs: ({context: {packQueue}}) => !isEmpty(packQueue),
    hasInstallJobs: ({context: {installQueue}}) => !isEmpty(installQueue),
    hasInstallError: ({context: {installError}}) => Boolean(installError),
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
  types: {
    input: {} as PkgManagerMachineInput,
    context: {} as PkgManagerMachineContext,
    events: {} as PkgManagerMachineEvent,
    output: {} as PkgManagerMachineOutput,
  },
}).createMachine({
  id: 'PkgManagerMachine',
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
  exit: [log(({context: {spec}}) => `PkgManagerMachine for ${spec} stopped`)],
  initial: 'idle',
  context: ({
    input: {
      spec,
      opts: {loose = false, verbose = false} = {},
      shouldLint = false,
      shouldShutdown = false,
      additionalDeps = [],
      ruleInitPayloads = [],
      workspaceInfo,
      ...input
    },
  }) => {
    const installQueue: PkgManagerMachineContext['installQueue'] = [];
    const lintQueue: PkgManagerMachineContext['lintQueue'] = [];
    const packQueue: PkgManagerMachineContext['packQueue'] = [...workspaceInfo];
    const pkgManager: PkgManagerMachineContext['pkgManager'] = serialize(spec);
    const ruleDefs: PkgManagerMachineContext['ruleDefs'] = ruleInitPayloads.map(
      ({def}) => def,
    );
    const ruleResultMap: PkgManagerMachineContext['ruleResultMap'] = new Map();
    const runScriptActorRefs: PkgManagerMachineContext['runScriptActorRefs'] =
      {};
    const runScriptQueue: PkgManagerMachineContext['runScriptQueue'] = [];
    const workspaceInfoResult: PkgManagerMachineContext['workspaceInfoResult'] =
      workspaceInfo.map(asResult);
    return {
      ...input,
      runScriptActorRefs,
      spec,
      workspaceInfoResult,
      pkgManager,
      workspaceInfo,
      ruleInitPayloads,
      ruleDefs,
      opts: {loose, verbose},
      packQueue,
      installQueue,
      runScriptQueue,
      lintQueue,
      additionalDeps,
      shouldShutdown,
      shouldLint,
      ruleResultMap,
    };
  },
  on: {
    ABORT: {
      actions: [
        log(({context: {error}}) =>
          error ? `ERROR: ${error?.message}` : 'aborting',
        ),
        'stopAllChildren',
        'aborted',
      ],
      target: '.shutdown',
    },
  },
  states: {
    idle: {
      on: {
        BEGIN: {
          actions: log('👋 Received BEGIN; initializing...'),
          target: 'startup',
        },
      },
      always: {
        guard: 'isImmediateMode',
        target: 'startup',
      },
    },
    startup: {
      initial: 'init',
      states: {
        init: {
          description:
            'Initial creation of PkgManager context object. If anything fails here, the machine aborts',
          entry: [log('Creating temp dir...')],
          invoke: {
            src: 'createTempDir',
            input: ({context: {fileManager, pkgManager: spec}}) => ({
              spec,
              fileManager,
            }),
            onDone: {
              actions: [
                {
                  type: 'assignTmpdir',
                  params: ({event: {output}}) => output,
                },
                'createPkgManagerContext',
              ],
              target: 'setupLifecycle',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({context: {pkgManager}, event: {error}}) => ({
                    error: new TempDirError(
                      `Package manager ${pkgManager.spec} could not create a temp dir`,
                      pkgManager.spec,
                      fromUnknownError(error),
                    ),
                  }),
                },
              ],
              target: 'errored',
            },
          },
        },
        setupLifecycle: {
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
            onDone: 'done',
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({
                    event: {error},
                    context: {pkgManager, plugin},
                  }) => ({
                    error: new LifecycleError(
                      fromUnknownError(error),
                      'setup',
                      'pkg-manager',
                      pkgManager.spec,
                      plugin,
                    ),
                  }),
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
          entry: 'abort',
          type: FINAL,
        },
      },
      onDone: 'working',
    },
    working: {
      description:
        'This is where most things happen. As soon as a pkg is packed, it will be installed. As soon as it is installed, we can lint or run scripts; this all happens in parallel',
      type: PARALLEL,
      // we can start installing additional deps as soon as we have a tmpdir
      entry: 'enqueueAdditionalDeps',
      states: {
        packing: {
          exit: 'freePackError',
          description:
            'Packs chosen workspaces in parallel. If an error occurs in this state, the machine will abort',
          initial: 'idle',
          states: {
            idle: {
              description: 'Short-circuit before PkgManagerPackBegin is sent',
              always: [
                {
                  guard: 'nothingToDo',
                  actions: log('nothing to pack!'),
                  target: 'done',
                },
                {
                  actions: 'sendPkgManagerPackBegin',
                  target: 'packingPkgs',
                },
              ],
            },
            packingPkgs: {
              always: [
                {
                  guard: 'isPackingComplete',
                  target: 'done',
                },
                {
                  guard: 'hasPackJobs',
                  actions: [
                    log(
                      ({context: {packQueue}}) =>
                        `packing ${head(packQueue)!.pkgName}`,
                    ),
                    'spawnPackActor',
                    'pkgPackBegin',
                  ],
                  target: 'packingPkgs',
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
                      type: 'stopPackActor',
                      params: ({event}) => {
                        const id = idFromEventType(event);
                        assert.ok(id);
                        return id;
                      },
                    },
                  ],
                },
                'xstate.error.actor.pack.*': {
                  actions: [
                    log('pack errored!'),
                    {
                      type: 'assignPackError',
                      params: ({event: {error}}) => ({error}),
                    },
                    {
                      type: 'sendPkgPackFailedEvent',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: 'errored',
                },
              },
            },
            errored: {
              entry: [log('packing errored'), 'sendPkgManagerPackEnd', 'abort'],
              type: FINAL,
            },
            done: {
              entry: ['sendPkgManagerPackEnd', log('packing complete')],
              type: FINAL,
            },
          },
        },
        installing: {
          description:
            'Installs tarballs and additional deps in serial. If anything operation throws or rejects in this state, the machine will abort',
          entry: [log('ready to install')],
          initial: 'idle',
          states: {
            idle: {
              always: [
                {
                  guard: 'hasInstallJobs',
                  target: 'installingPkgs',
                },
                {
                  guard: 'nothingToDo',
                  actions: [log('nothing to install!')],
                  target: 'done',
                },
              ],
            },
            installingPkgs: {
              entry: ['sendPkgManagerInstallBegin'],
              exit: ['sendPkgManagerInstallEnd', 'freeInstallResults'],
              initial: 'installPkg',
              states: {
                installPkg: {
                  entry: ['takeInstallJob', 'sendPkgInstallBegin'],
                  invoke: {
                    src: 'install',
                    input: ({
                      context: {def, ctx, currentInstallJob, pkgManager},
                    }): InstallInput => {
                      assert.ok(currentInstallJob);
                      assert.ok(ctx);

                      return {
                        def,
                        ctx: {
                          ...ctx,
                          installManifest: currentInstallJob,
                        },
                        spec: pkgManager,
                      };
                    },
                    onDone: {
                      actions: [
                        // TODO combine?
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
                        // TODO: don't use type assertion
                        {
                          type: 'assignInstallError',
                          params: ({event: {error}}) => error as InstallError,
                        },
                        {
                          type: 'sendPkgInstallFailed',
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
                      guard: 'hasInstallJobs',
                      target: 'installPkg',
                    },
                    {
                      guard: 'isInstallationComplete',
                      target: 'done',
                    },
                  ],
                },
                done: {
                  type: FINAL,
                },
                errored: {
                  type: FINAL,
                },
              },
              onDone: [
                {
                  guard: 'hasInstallError',
                  target: 'errored',
                },
                {
                  target: 'done',
                },
              ],
            },
            done: {
              entry: [log('installation complete')],
              type: FINAL,
            },
            errored: {
              entry: [log('installation errored! aborting'), 'abort'],
              type: FINAL,
            },
          },
          exit: ['freeInstallError'],
        },
        runningScripts: {
          initial: 'idle',
          states: {
            idle: {
              description:
                'A list of scripts should be provided within the machine input; if it is empty, we can exit early',
              always: [
                {
                  guard: 'shouldRunScripts',
                  target: 'running',
                },
                {
                  guard: not('shouldRunScripts'),
                  target: 'noop',
                },
              ],
            },
            running: {
              entry: 'sendPkgManagerRunScriptsBegin',
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
                {
                  guard: 'isRunningComplete',
                  target: 'done',
                },
                {
                  guard: 'hasRunScriptJobs',
                  actions: [
                    log(({context: {runScriptQueue = []}}) => {
                      const job = head(runScriptQueue);
                      const {pkgName = 'unknown', script = 'unknown'} =
                        job ?? {};
                      return `running script ${script} in ${pkgName}`;
                    }),
                    'spawnRunScript',
                    'sendRunScriptBegin',
                  ],
                  target: 'running',
                },
              ],
              on: {
                RUN_SCRIPT: {
                  actions: [
                    {
                      type: 'appendRunScriptManifest',
                      params: ({event: {manifest}}) => manifest,
                    },
                  ],
                },
                'xstate.done.actor.runScript.*': [
                  {
                    // TODO move to guards
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
                          return {error: result.error};
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
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: 'errored',
                },
              },
            },
            noop: {
              entry: [log('skipped script run')],
              type: FINAL,
            },
            errored: {
              entry: [log('script run errored'), 'sendPkgManagerRunScriptsEnd'],
              type: FINAL,
            },
            done: {
              entry: [
                log('script run complete'),
                'sendPkgManagerRunScriptsEnd',
              ],
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
                  type: 'spawnPrepareLintManifest',
                  params: ({context: {fileManager}, event}) => ({
                    fileManager,
                    ...event,
                  }),
                },
              ],
            },
            'xstate.done.actor.prepareLintManifest.*': {
              actions: [
                {
                  type: 'appendLintManifest',
                  params: ({event: {output}}) => output,
                },
              ],
            },
            'xstate.error.actor.prepareLintManifest.*': {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => ({error}),
                },
              ],
            },
            CHECK_RESULT: {
              description:
                'Once a RuleMachine has completed a rule check successfully, it will send this event',
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
                  params: ({event: {output}}) => output,
                },
              ],
            },
            CHECK_ERROR: {
              description:
                'If a rule check implementation throws or rejects, this event will be sent by a RuleMachine',
              actions: [
                {
                  type: 'assignRuleError',
                  params: ({
                    event: {
                      output: {error},
                    },
                  }) => error,
                },
                {
                  type: 'sendRuleEnd',
                  params: ({event: {output}}) => output,
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
                  actions: ['sendPkgManagerLintBegin', 'assignRuleMachineRefs'],
                },
                {
                  guard: not('shouldLint'),
                  actions: [log('no linting to do')],
                  target: 'noop',
                },
              ],
            },
            lintingPkgs: {
              always: [
                {
                  guard: 'hasLintJobs',
                  actions: 'lint',
                  target: 'lintingPkgs',
                },
                {
                  guard: 'isLintingComplete',
                  actions: 'sendPkgManagerLintEnd',
                  target: 'done',
                },
                // TODO this doesn't seem right
                {
                  guard: 'hasError',
                  actions: 'sendPkgManagerLintEnd',
                  target: 'errored',
                },
              ],
            },
            noop: {
              entry: [log('linting skipped'), 'freeRuleData'],
              type: FINAL,
            },
            done: {
              entry: [log('linting complete'), 'freeRuleData'],
              type: FINAL,
            },
            errored: {
              entry: [
                log('linting errored'),
                'sendPkgManagerLintEnd',
                'freeRuleData',
              ],
              type: FINAL,
            },
          },
        },
      },
      onDone: [
        {
          guard: 'shouldShutdown',
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
              guard: 'shouldPruneTempDir',
              target: 'cleanupFilesystem',
              actions: [
                log(({context: {tmpdir}}) => `will destroy temp dir ${tmpdir}`),
              ],
            },
            {
              guard: 'shouldLinger',
              target: 'teardownLifecycle',
              actions: [
                log(
                  ({context: {tmpdir}}) =>
                    `leaving temp dir to linger: ${tmpdir}`,
                ),
                'sendLingered',
              ],
            },
            {
              guard: 'hasContext',
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
                  params: ({
                    event: {error},
                    context: {
                      pkgManager: {spec},
                      tmpdir,
                    },
                  }) => {
                    assert.ok(tmpdir);
                    return {
                      error: new CleanupError(
                        `${spec} failed to clean up its temp dir: ${tmpdir}`,
                        tmpdir,
                        fromUnknownError(error),
                      ),
                    };
                  },
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
            onDone: 'done',
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({
                    event: {error},
                    context: {pkgManager, plugin},
                  }) => ({
                    error: new LifecycleError(
                      fromUnknownError(error),
                      'teardown',
                      'pkg-manager',
                      pkgManager.spec,
                      plugin,
                    ),
                  }),
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
          type: FINAL,
        },
      },
      onDone: 'done',
    },
    done: {
      type: FINAL,
    },
  },
  output: ({context: {error, aborted}, self: {id}}): PkgManagerMachineOutput =>
    error ? {type: ERROR, error, id, aborted} : {type: OK, id, aborted: false},
});
