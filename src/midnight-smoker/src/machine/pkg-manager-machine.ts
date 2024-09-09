import type * as MachineInstallEvents from '#machine/event/install';
import type * as MachineLintEvents from '#machine/event/lint';
import type * as MachinePackEvents from '#machine/event/pack';
import type * as MachineScriptEvents from '#machine/event/script';
import type * as Schema from '#schema/meta/for-pkg-manager-machine';

import {
  ERROR,
  FAILED,
  FINAL,
  InstallEvents,
  LintEvents,
  OK,
  PackEvents,
  PARALLEL,
  ScriptEvents,
  SKIPPED,
} from '#constants';
import {AbortError} from '#error/abort-error';
import {CleanupError} from '#error/cleanup-error';
import {InstallError} from '#error/install-error';
import {LifecycleError} from '#error/lifecycle-error';
import {MachineError} from '#error/machine-error';
import {type PackError} from '#error/pack-error';
import {type PackParseError} from '#error/pack-parse-error';
import {type RuleError} from '#error/rule-error';
import {type SomePackError} from '#error/some-pack-error';
import {TempDirError} from '#error/temp-dir-error';
import {type Executor} from '#executor';
import {
  installLogic,
  type InstallLogicInput,
} from '#machine/actor/operation/install-logic';
import {
  type LintLogicOutput,
  type LintLogicOutputError,
} from '#machine/actor/operation/lint-logic';
import {packLogic} from '#machine/actor/operation/pack-logic';
import {
  runScriptLogic,
  type RunScriptLogicOutput,
} from '#machine/actor/operation/run-script-logic';
import {
  setupPkgManagerLogic,
  teardownPkgManagerLogic,
} from '#machine/actor/pkg-manager-lifecycle';
import {
  prepareLintManifestLogic,
  type PrepareLintManifestLogicInput,
} from '#machine/actor/prepare-lint-manifest';
import {createTempDirLogic, pruneTempDirLogic} from '#machine/actor/temp-dir';
import {type AbortEvent} from '#machine/event/abort';
import {type SmokeMachineLingeredEvent} from '#machine/event/lingered';
import {type SmokeMachinePkgManagerEvent} from '#machine/event/pkg-manager';
import {RuleMachine} from '#machine/rule-machine';
import {
  type ActorOutputError,
  type ActorOutputOk,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
} from '#machine/util';
import {
  type PkgManagerEnvelope,
  type RuleEnvelope,
} from '#plugin/component-envelope';
import * as assert from '#util/assert';
import {fromUnknownError} from '#util/error-util';
import {type FileManager} from '#util/filemanager';
import {isSmokerError} from '#util/guard/smoker-error';
import {isWorkspaceInstallManifest} from '#util/guard/workspace-install-manifest';
import {asResult, type Result} from '#util/result';
import {serialize} from '#util/serialize';
import {uniqueId} from '#util/unique-id';
import {head, isEmpty, keyBy, map, omit, partition} from 'lodash';
import {
  type ActorRef,
  type ActorRefFrom,
  and,
  assign,
  type DoneActorEvent,
  enqueueActions,
  type ErrorActorEvent,
  log,
  not,
  raise,
  sendTo,
  setup,
  type Snapshot,
} from 'xstate';

import {type CheckErrorEvent, type CheckResultEvent} from './event/check.js';

export type PkgManagerMachineEvent =
  | AbortEvent
  | CheckErrorEvent
  | CheckResultEvent
  | PkgManagerMachineBeginEvent
  | PkgManagerMachineHaltEvent
  | PkgManagerMachineLintEvent
  | PkgManagerMachinePackDoneEvent
  | PkgManagerMachinePackErrorEvent
  | PkgManagerMachinePrepareLintManifestDoneEvent
  | PkgManagerMachinePrepareLintManifestErrorEvent
  | PkgManagerMachineRuleEndEvent
  | PkgManagerMachineRunScriptDoneEvent
  | PkgManagerMachineRunScriptErrorEvent
  | PkgManagerMachineRunScriptEvent;

export type PkgManagerMachineOutput =
  | ActorOutputOk<{aborted: false; noop: boolean}>
  | PkgManagerMachineOutputError;

export type PkgManagerMachineOutputError = ActorOutputError<
  MachineError,
  {aborted?: boolean; noop: boolean}
>;

export interface PkgManagerMachineContext extends PkgManagerMachineInput {
  /**
   * Whether or not the machine has aborted
   */
  aborted?: boolean;

  /**
   * Additional dependencies; defaults to empty array
   */
  additionalDeps: readonly string[];

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
   * Objects telling the {@link Schema.PkgManager} what to install.
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
   * Objects telling the {@link Schema.PkgManager} what to lint
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
   * References to {@link packLogic} actors.
   *
   * References are kept so that they can be aborted if necessary. **Any error
   * thrown from a {@link packLogic pack actor} should cause the machine to
   * abort**.
   */
  packActorRefs?: Record<string, ActorRefFrom<typeof packLogic>>;

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

  pkgManager: Schema.PkgManager;

  /**
   * The `plugin` from {@link PkgManagerMachineInput.envelope}
   */
  plugin: Schema.StaticPluginMetadata;

  prepareLintManifestRefs?: Record<
    string,
    ActorRefFrom<typeof prepareLintManifestLogic>
  >;

  /**
   * Information about rules and the plugins to which they belong
   */
  ruleEnvelopes: RuleEnvelope[];

  /**
   * Errors from rules, if any
   */
  ruleErrors?: RuleError[];

  /**
   * References to {@link RuleMachine} actors; one per item in {@link rules}.
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

  /**
   * List of {@link Schema.SomeRule} objects derived from {@link ruleEnvelopes}
   *
   * Needed by `linting` state.
   */
  rules?: Schema.SomeRule[];

  runScriptActorRefs: Record<string, ActorRefFrom<typeof runScriptLogic>>;

  /**
   * Objects telling the {@link Schema.PkgManager} what scripts to run and where
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
   * The `spec` from {@link PkgManagerMachineInput.envelope}
   *
   * Just here for convenience, since many events will need this information.
   */
  spec: Schema.StaticPkgManagerSpec;

  /**
   * Per-{@link Schema.PkgManager} temporary directory.
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
  additionalDeps?: readonly string[];
  envelope: PkgManagerEnvelope;

  /**
   * The executor to pass to the package manager's functions
   */
  executor: Executor;

  /**
   * File manager instance for interacting with filesystem
   */
  fileManager: FileManager;

  /**
   * If `true`, run in "immediate" mode; do not wait for
   * {@link PkgManagerMachineBeginEvent}
   */
  immediate?: boolean;

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
  parentRef: ActorRef<Snapshot<unknown>, SmokeMachinePkgManagerEvent>;

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
  ruleEnvelopes?: RuleEnvelope[];

  /**
   * Custom scripts to run
   *
   * Corresponds to `SmokerOptions.script`
   */
  scripts?: readonly string[];

  /**
   * Whether or not linting should be performed.
   *
   * Linting also requires {@link rules} to be non-empty.
   */
  shouldLint?: boolean;

  /**
   * Whether or not the machine should shutdown after completion of its tasks.
   */
  shouldShutdown?: boolean;

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
 * Received when the {@link packLogic "pack" Promise actor} has completed
 * successfully.
 *
 * @event
 */
export interface PkgManagerMachinePackDoneEvent
  extends DoneActorEvent<Schema.InstallManifest> {
  type: 'xstate.done.actor.pack.*';
}

/**
 * Received when the {@link packLogic "pack" Promise actor} has completed with
 * error.
 *
 * **Note**: This should cause the machine to abort.
 *
 * @event
 */
export interface PkgManagerMachinePackErrorEvent
  extends ErrorActorEvent<PackError | PackParseError> {
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
  output: LintLogicOutput;
  type: 'RULE_END';
}

export interface PkgManagerMachineRunScriptDoneEvent
  extends DoneActorEvent<RunScriptLogicOutput> {
  type: 'xstate.done.actor.runScript.*';
}

export interface PkgManagerMachineRunScriptErrorEvent
  extends ErrorActorEvent<Schema.ScriptError> {
  type: 'xstate.error.actor.runScript.*';
}

export interface PkgManagerMachineRunScriptEvent {
  manifest: Schema.RunScriptManifest;
  type: 'RUN_SCRIPT';
}

/**
 * Machine which controls how a {@link Schema.PkgManager} performs its
 * operations.
 *
 * @internal
 */
export const PkgManagerMachine = setup({
  actions: {
    abort: raise({type: 'ABORT'}),
    aborted: assign({aborted: true}),
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
    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: Schema.RunScriptResult,
      ) => {
        return [...runScriptResults, runScriptResult];
      },
    }),
    assignError: assign({
      error: ({context, self}, {error: err}: {error: unknown}) => {
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
    assignInstallError: enqueueActions(
      ({enqueue}, installError: InstallError) => {
        enqueue.assign({installError});
        // @ts-expect-error xstate/TS limitation
        enqueue({params: {error: installError}, type: 'assignError'});
      },
    ),
    assignPackError: enqueueActions(
      ({enqueue}, {error}: {error: SomePackError}) => {
        enqueue.assign({packError: error});
        // @ts-expect-error xstate/TS limitation
        enqueue({params: {error}, type: 'assignError'});
      },
    ),
    assignRuleError: enqueueActions(
      ({context: {ruleErrors = []}, enqueue}, ruleError: RuleError) => {
        enqueue.assign({ruleErrors: [...ruleErrors, ruleError]});
        // @ts-expect-error xstate/TS limitation
        enqueue({params: {error: ruleError}, type: 'assignError'});
      },
    ),
    assignRuleMachineRefs: assign({
      ruleMachineRefs: ({context: {ruleEnvelopes}, self, spawn}) =>
        Object.fromEntries(
          ruleEnvelopes.map((envelope) => {
            const {id: ruleId} = envelope;
            const id = uniqueId({prefix: 'rule', suffix: ruleId});
            const actorRef = spawn('RuleMachine', {
              id,
              input: {
                envelope,
                parentRef: self,
              },
            });
            // INDEXED BY RULE ID
            return [ruleId, actorRef];
          }),
        ),
    }),
    assignTmpdir: assign({
      tmpdir: (_, tmpdir: string) => tmpdir,
    }),
    createPkgManagerContext: assign({
      ctx: ({
        context: {executor, opts, spec, tmpdir, useWorkspaces, workspaceInfo},
      }): Schema.PkgManagerContext => {
        assert.ok(tmpdir);
        return {
          executor,
          spec,
          tmpdir,
          useWorkspaces,
          workspaceInfo,
          ...opts,
        };
      },
    }),

    /**
     * Creates install manifests for each additional dep and appends them as
     * {@link Schema.InstallManifest}s to the install queue
     */
    enqueueAdditionalDeps: enqueueActions(
      ({
        context: {
          additionalDeps,
          installManifests = [],
          installQueue = [],
          tmpdir,
          workspaceInfo,
        },
        enqueue,
      }) => {
        if (isEmpty(workspaceInfo)) {
          return;
        }
        assert.ok(tmpdir);
        assert.ok(isEmpty(installQueue));
        const newInstallManifests: Schema.InstallManifest[] =
          additionalDeps.map((dep) => ({
            cwd: tmpdir,
            isAdditional: true,
            pkgName: dep,
            pkgSpec: dep,
          }));
        enqueue.assign({
          installQueue: [...installQueue, ...newInstallManifests],
        });
        enqueue.assign({
          installManifests: [...installManifests, ...newInstallManifests],
        });
      },
    ),
    freeInstallError: assign({
      installError: undefined,
    }),
    freePackError: assign({
      packError: undefined,
    }),
    freeRuleData: enqueueActions(
      ({context: {ruleMachineRefs = {}}, enqueue}) => {
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
    handleInstallFailure: enqueueActions(
      (
        {
          context: {
            currentInstallJob: installManifest,
            parentRef,
            spec: pkgManager,
          },
          enqueue,
          self: {id: sender},
        },
        error: AbortError | InstallError,
      ) => {
        if (isSmokerError(AbortError, error)) {
          // the machine has already been aborted
          return;
        }
        if (isSmokerError(InstallError, error)) {
          // @ts-expect-error sux
          enqueue({params: error, type: 'assignInstallError'});
          assert.ok(installManifest);
          const evt: MachineInstallEvents.SmokeMachinePkgInstallFailedEvent = {
            error,
            installManifest,
            pkgManager,
            sender,
            type: InstallEvents.PkgInstallFailed,
          };
          enqueue.sendTo(parentRef, evt);
          return;
        }
        enqueue({
          // @ts-expect-error sux
          params: {error: fromUnknownError(error)},
          type: 'assignError',
        });
      },
    ),
    handleInstallResult: enqueueActions(
      (
        {context: {scripts = [], shouldLint, workspaceInfo}, enqueue},
        installResult: Schema.InstallResult,
      ) => {
        const {installManifest} = installResult;
        if (isWorkspaceInstallManifest(installManifest)) {
          const {installPath, localPath, pkgName} = installManifest;
          const workspace = workspaceInfo.find(
            ({localPath, pkgName}) =>
              localPath === installManifest.localPath &&
              pkgName === installManifest.pkgName,
          );
          assert.ok(
            workspace,
            `No known workspace exists with local path "${installManifest.localPath}" and package name "${installManifest.pkgName}". This is a bug`,
          );

          if (shouldLint) {
            enqueue.raise({
              installPath,
              type: 'LINT',
              workspaceInfo: workspace,
            });
          }
          for (const script of scripts) {
            const runScriptManifest: Schema.RunScriptManifest = {
              cwd: installPath,
              localPath,
              pkgJson: workspace.pkgJson,
              pkgJsonPath: workspace.pkgJsonPath,
              pkgName,
              rawPkgJson: workspace.rawPkgJson,
              script,
            };

            enqueue.raise({
              manifest: runScriptManifest,
              type: 'RUN_SCRIPT',
            });
          }
        }
      },
    ),
    handlePackFailure: enqueueActions(
      (
        {context: {parentRef, spec: pkgManager}, enqueue, self: {id: sender}},
        error: AbortError | SomePackError,
      ) => {
        if (isSmokerError(AbortError, error)) {
          // the machine has already been aborted
          return;
        }
        // @ts-expect-error sux
        enqueue({params: {error}, type: 'assignPackError'});
        const evt: MachinePackEvents.SmokeMachinePkgPackFailedEvent = {
          error,
          pkgManager,
          sender,
          type: PackEvents.PkgPackFailed,
          workspace: asResult(error.context.workspace),
        };
        enqueue.sendTo(parentRef, evt);
      },
    ),
    handleRunScriptResult: enqueueActions(
      (
        {context: {runScriptResults = []}, enqueue},
        output: RunScriptLogicOutput,
      ) => {
        const {result} = output;
        enqueue.assign({
          runScriptResults: [...runScriptResults, result],
        });
        // @ts-expect-error - TS bad
        enqueue({params: output, type: 'sendRunScriptEnd'});
        if (result.type === ERROR) {
          // @ts-expect-error - TS bad
          enqueue({params: {error: result.error}, type: 'assignError'});
        }
      },
    ),
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),
    lint: enqueueActions(
      ({
        context: {
          lintQueue = [],
          parentRef,
          ruleConfigs,
          ruleEnvelopes,
          ruleMachineRefs,
          spec,
        },
        enqueue,
        self: {id: sender},
      }) => {
        assert.ok(
          lintQueue.length,
          'Expected a non-empty lint queue when beginning rule lint',
        );
        assert.ok(
          !isEmpty(ruleMachineRefs),
          'Expected non-empty rule machine refs; are there any rules?',
        );

        const queue = [...lintQueue];
        const manifest = queue.shift()!;
        for (const {id: ruleId} of ruleEnvelopes) {
          const config = ruleConfigs[ruleId];
          const evt: MachineLintEvents.SmokeMachineRuleBeginEvent = {
            config,
            manifest: {
              ...asResult(manifest),
              workspace: asResult(manifest.workspace),
            },
            pkgManager: spec,
            rule: ruleId,
            sender,
            type: LintEvents.RuleBegin,
          };
          enqueue.sendTo(parentRef, evt);

          const ref = ruleMachineRefs[ruleId];
          assert.ok(ref);

          enqueue.sendTo(ref, {
            ctx: {
              ...manifest,
              pkgManager: `${spec.label}`,
              ruleId,
              severity: config.severity,
            },
            manifest,
            type: 'CHECK',
          });
        }
        enqueue.assign({
          lintQueue: queue,
        });
      },
    ),
    pkgPackBegin: enqueueActions(
      ({
        context: {ctx, packQueue, parentRef, spec: pkgManager},
        enqueue,
        self: {id: sender},
      }) => {
        const queue = [...packQueue];
        const workspace = queue.shift();
        assert.ok(workspace, 'Expected workspace to pack');
        assert.ok(ctx, 'Expected PkgManagerContext to eixst');
        const evt: MachinePackEvents.SmokeMachinePkgPackBeginEvent = {
          pkgManager,
          sender,
          type: PackEvents.PkgPackBegin,
          workspace: asResult(workspace),
        };
        enqueue.sendTo(parentRef, evt);
        enqueue.assign({packQueue: queue});
      },
    ),
    sendLingered: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): SmokeMachineLingeredEvent => {
        const {tmpdir} = context;
        assert.ok(tmpdir);
        return {
          directory: tmpdir,
          type: 'LINGERED',
        };
      },
    ),
    sendPkgInstallBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {currentInstallJob: installManifest, spec: pkgManager},
        self: {id: sender},
      }): MachineInstallEvents.SmokeMachinePkgInstallBeginEvent => {
        assert.ok(installManifest);
        return {
          installManifest,
          pkgManager,
          sender,
          type: InstallEvents.PkgInstallBegin,
        };
      },
    ),

    sendPkgInstallOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context: {spec: pkgManager}, self},
        {installManifest, rawResult}: Schema.InstallResult,
      ): MachineInstallEvents.SmokeMachinePkgInstallOkEvent => ({
        installManifest,
        pkgManager,
        rawResult,
        sender: self.id,
        type: InstallEvents.PkgInstallOk,
      }),
    ),
    sendPkgManagerInstallBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {installManifests = [], spec: pkgManager},
        self,
      }): MachineInstallEvents.SmokeMachinePkgManagerInstallBeginEvent => ({
        manifests: installManifests,
        pkgManager,
        sender: self.id,
        type: InstallEvents.PkgManagerInstallBegin,
      }),
    ),
    sendPkgManagerInstallEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {installError, installManifests = [], spec: pkgManager},
        self: {id: sender},
      }):
        | MachineInstallEvents.SmokeMachinePkgManagerInstallFailedEvent
        | MachineInstallEvents.SmokeMachinePkgManagerInstallOkEvent => {
        const baseEventData = {
          manifests: installManifests,
          pkgManager,
          sender,
        };
        return installError
          ? {
              ...baseEventData,
              error: installError,
              type: InstallEvents.PkgManagerInstallFailed,
            }
          : {
              ...baseEventData,
              type: InstallEvents.PkgManagerInstallOk,
            };
      },
    ),
    sendPkgManagerLintBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {spec: pkgManager, workspaceInfoResult},
        self,
      }): MachineLintEvents.SmokeMachinePkgManagerLintBeginEvent => {
        return {
          pkgManager,
          sender: self.id,
          type: LintEvents.PkgManagerLintBegin,
          workspaceInfo: workspaceInfoResult,
        };
      },
    ),
    sendPkgManagerLintEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {
          error,
          lintManifests,
          ruleResultMap,
          spec: pkgManager,
          workspaceInfoResult,
        },
        self: {id: sender},
      }):
        | MachineLintEvents.SmokeMachinePkgManagerLintFailedEvent
        | MachineLintEvents.SmokeMachinePkgManagerLintOkEvent => {
        let hasIssues = false;

        const manifestsByInstallPath = keyBy(lintManifests, 'installPath');

        // turn the ugly map into `LintResult`
        const lintResults = [...ruleResultMap.entries()].map<Schema.LintResult>(
          ([installPath, resultMap]) => {
            const results = [...resultMap.values()].flat();
            const [okResults, failedResults] = partition(results, {
              type: OK,
            }) as [Schema.CheckResultOk[], Schema.CheckResultFailed[]];
            hasIssues = hasIssues || !isEmpty(failedResults);

            const manifest = asResult(manifestsByInstallPath[installPath]);
            assert.ok(manifest, `Expected a lint manifest for ${installPath}`);

            const retval = isEmpty(failedResults)
              ? ({
                  ...manifest,
                  results: okResults,
                  type: OK,
                } as const)
              : ({
                  ...manifest,
                  results,
                  type: FAILED,
                } as const);

            return retval;
          },
        );

        return error || hasIssues
          ? {
              pkgManager,
              results: lintResults,
              sender,
              type: LintEvents.PkgManagerLintFailed,
              workspaceInfo: workspaceInfoResult,
            }
          : {
              pkgManager,
              results: lintResults,
              sender,
              type: LintEvents.PkgManagerLintOk,
              workspaceInfo: workspaceInfoResult,
            };
      },
    ),
    sendPkgManagerPackBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {spec: pkgManager},
        self,
      }): MachinePackEvents.SmokeMachinePkgManagerPackBeginEvent => {
        return {
          pkgManager,
          sender: self.id,
          type: PackEvents.PkgManagerPackBegin,
        };
      },
    ),
    sendPkgManagerPackEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {
          installManifests: manifests = [],
          packError: error,
          spec: pkgManager,
        },
        self: {id},
      }):
        | MachinePackEvents.SmokeMachinePkgManagerPackFailedEvent
        | MachinePackEvents.SmokeMachinePkgManagerPackOkEvent => {
        const baseEventData = {
          pkgManager,
          sender: id,
        };
        return error
          ? {
              error,
              type: PackEvents.PkgManagerPackFailed,
              ...baseEventData,
            }
          : {
              manifests,
              type: PackEvents.PkgManagerPackOk,
              ...baseEventData,
            };
      },
    ),
    sendPkgManagerRunScriptsBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {
          runScriptManifests = [],
          spec: pkgManager,
          workspaceInfoResult,
        },
        self: {id: sender},
      }): MachineScriptEvents.SmokeMachinePkgManagerRunScriptsBeginEvent => ({
        manifests: runScriptManifests,
        pkgManager,
        sender,
        type: ScriptEvents.PkgManagerRunScriptsBegin,
        workspaceInfo: workspaceInfoResult,
      }),
    ),

    sendPkgManagerRunScriptsEnd: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        context: {
          runScriptManifests = [],
          runScriptResults = [],
          spec: pkgManager,
          workspaceInfoResult,
        },
        self: {id: sender},
      }):
        | MachineScriptEvents.SmokeMachinePkgManagerRunScriptsFailedEvent
        | MachineScriptEvents.SmokeMachinePkgManagerRunScriptsOkEvent => {
        const type = runScriptResults?.some(
          (r) => r.type === ERROR || r.type === FAILED,
        )
          ? ScriptEvents.PkgManagerRunScriptsFailed
          : ScriptEvents.PkgManagerRunScriptsOk;
        return {
          manifests: runScriptManifests,
          pkgManager,
          results: runScriptResults,
          sender,
          type,
          workspaceInfo: workspaceInfoResult,
        };
      },
    ),
    sendPkgPackOk: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context: {spec: pkgManager}, self: {id: sender}},
        installManifest: Schema.InstallManifest,
      ): MachinePackEvents.SmokeMachinePkgPackOkEvent => {
        assert.ok(isWorkspaceInstallManifest(installManifest));
        const workspace = {
          localPath: installManifest.localPath,
          pkgJson: installManifest.pkgJson,
          pkgJsonPath: installManifest.pkgJsonPath,
          pkgName: installManifest.pkgName,
        } as Schema.WorkspaceInfo;
        return {
          installManifest: asResult(installManifest),
          pkgManager,
          sender,
          type: PackEvents.PkgPackOk,
          workspace: asResult(workspace),
        };
      },
    ),

    /**
     * This sends the `RuleEnd` event as well as the appropriate `RuleOk`,
     * `RuleFailed`, or `RuleError` event
     */
    sendRuleEnd: enqueueActions(
      (
        {context: {parentRef, spec: pkgManager}, enqueue, self: {id: sender}},
        input: LintLogicOutput | LintLogicOutputError,
      ) => {
        if (input.type === ERROR) {
          const {ruleId: rule, ...output} = input;
          const evt: MachineLintEvents.SmokeMachineRuleErrorEvent = {
            ...output,
            pkgManager,
            rule,
            sender,
            type: LintEvents.RuleError,
          };
          enqueue.sendTo(parentRef, evt);
        } else {
          const {result, ruleId: rule, type, ...output} = input;
          const specificRuleEndEvent:
            | MachineLintEvents.SmokeMachineRuleFailedEvent
            | MachineLintEvents.SmokeMachineRuleOkEvent =
            type === OK
              ? {
                  result,
                  ...output,
                  pkgManager,
                  rule,
                  sender,
                  type: LintEvents.RuleOk,
                }
              : {
                  result,
                  ...output,
                  pkgManager,
                  rule,
                  sender,
                  type: LintEvents.RuleFailed,
                };
          enqueue.sendTo(parentRef, specificRuleEndEvent);
        }
        const {ruleId: rule, type: _, ...output} = input;
        const ruleEndEvent: MachineLintEvents.SmokeMachineRuleEndEvent = {
          ...output,
          pkgManager,
          rule,
          sender,
          type: LintEvents.RuleEnd,
        };
        enqueue.sendTo(parentRef, ruleEndEvent);
      },
    ),
    sendRunScriptBegin: enqueueActions(
      ({
        context: {
          ctx,
          parentRef,
          runScriptQueue = [],
          scripts,
          spec: pkgManager,
        },
        enqueue,
        self: {id: sender},
      }) => {
        assert.ok(!isEmpty(runScriptQueue));
        assert.ok(!isEmpty(scripts));
        assert.ok(ctx);

        const queue = [...runScriptQueue];
        const manifest = queue.shift();
        assert.ok(manifest);
        const evt: MachineScriptEvents.SmokeMachineRunScriptBeginEvent = {
          manifest,
          pkgManager,
          sender,
          type: ScriptEvents.RunScriptBegin,
        };
        enqueue.sendTo(parentRef, evt);
        enqueue.assign({
          runScriptQueue: queue,
        });
      },
    ),
    sendRunScriptEnd: enqueueActions(
      (
        {context: {parentRef, spec: pkgManager}, enqueue, self: {id: sender}},
        {manifest, result}: RunScriptLogicOutput,
      ) => {
        const baseEventData = {
          manifest,
          pkgManager,
          sender,
        };
        let evt: MachineScriptEvents.SomeSmokeMachineRunScriptResultEvent;

        // TODO: this can be more elegant
        switch (result.type) {
          case OK: {
            evt = {
              ...baseEventData,
              result,
              type: ScriptEvents.RunScriptOk,
            };
            break;
          }
          case FAILED: {
            evt = {
              ...baseEventData,
              result,
              type: ScriptEvents.RunScriptFailed,
            };
            break;
          }
          case ERROR: {
            evt = {
              ...baseEventData,
              result,
              type: ScriptEvents.RunScriptError,
            };
            break;
          }
          case SKIPPED: {
            evt = {
              ...baseEventData,
              result,
              type: ScriptEvents.RunScriptSkipped,
            };
            break;
          }
        }
        enqueue.sendTo(parentRef, evt);

        const evtEnd: MachineScriptEvents.SmokeMachineRunScriptEndEvent = {
          ...evt,
          type: ScriptEvents.RunScriptEnd,
        };
        enqueue.sendTo(parentRef, evtEnd);
      },
    ),
    shouldLint: assign({
      shouldLint: true,
    }),
    shutdown: assign({
      shouldShutdown: true,
    }),
    spawnPackActor: assign({
      packActorRefs: ({
        context: {ctx, envelope, packActorRefs = {}, packQueue},
        spawn,
      }) => {
        const workspace = head(packQueue);
        assert.ok(workspace, 'Expected a workspace to pack');
        assert.ok(ctx, 'Expected PkgManagerContext to exist');
        const id = uniqueId({prefix: 'pack', suffix: workspace.pkgName});
        const ref = spawn('pack', {
          id,
          input: {
            ctx: {
              ...ctx,
              ...workspace,
            },
            envelope,
          },
        });
        return {...packActorRefs, [id]: ref};
      },
    }),
    spawnPrepareLintManifest: assign({
      prepareLintManifestRefs: (
        {
          context: {
            fileManager,
            pkgManager: {spec},
            prepareLintManifestRefs = {},
          },
          spawn,
        },
        {
          installPath,
          workspaceInfo: workspace,
        }: {installPath: string; workspaceInfo: Schema.WorkspaceInfo},
      ) => {
        const input: PrepareLintManifestLogicInput = {
          fileManager,
          installPath,
          workspace,
        };
        const id = `prepareLintManifest.[${installPath}]<${spec}>`;
        const ref = spawn('prepareLintManifest', {
          id,
          input,
        });
        return {...prepareLintManifestRefs, [id]: ref};
      },
    }),
    spawnRunScript: assign({
      runScriptActorRefs: ({
        context: {
          ctx,
          envelope,
          runScriptActorRefs,
          runScriptQueue = [],
          scripts,
        },
        spawn,
      }) => {
        assert.ok(!isEmpty(runScriptQueue));
        assert.ok(!isEmpty(scripts));
        assert.ok(ctx);

        const queue = [...runScriptQueue];
        const manifest = queue.shift();
        assert.ok(manifest);
        const id = uniqueId({
          prefix: 'runScript',
          suffix: manifest.pkgName,
        });
        const ref = spawn('runScript', {
          id,
          input: {
            ctx: {
              manifest,
              ...ctx,
            },
            envelope,
          },
        });
        return {...runScriptActorRefs, [id]: ref};
      },
    }),
    stopAllChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      for (const child of Object.keys(snapshot.children)) {
        enqueue.stopChild(child);
      }
    }),
    stopPackActor: enqueueActions(
      ({context: {packActorRefs = {}}, enqueue}, id: string) => {
        enqueue.stopChild(id);
        packActorRefs = omit(packActorRefs, id);
        enqueue.assign({packActorRefs});
      },
    ),
    stopPrepareLintManifest: enqueueActions(
      ({context: {prepareLintManifestRefs = {}}, enqueue}, id: string) => {
        enqueue.stopChild(id);
        prepareLintManifestRefs = omit(prepareLintManifestRefs, id);
        enqueue.assign({prepareLintManifestRefs});
      },
    ),
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
    updateRuleResultMap: assign({
      ruleResultMap: (
        {context: {ruleResultMap}},
        {installPath, result, ruleId, type}: LintLogicOutput,
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
  },
  actors: {
    createTempDir: createTempDirLogic,
    install: installLogic,
    pack: packLogic,
    prepareLintManifest: prepareLintManifestLogic,
    pruneTempDir: pruneTempDirLogic,
    RuleMachine,
    runScript: runScriptLogic,
    setupPkgManager: setupPkgManagerLogic,
    teardownPkgManager: teardownPkgManagerLogic,
  },
  guards: {
    hasContext: ({context: {ctx}}) => Boolean(ctx),
    hasError: ({context: {error}}) => Boolean(error),
    hasInstallError: ({context: {installError}}) => Boolean(installError),
    hasInstallJobs: ({context: {installQueue}}) => !isEmpty(installQueue),
    hasInstallManifests: ({context: {installManifests}}) =>
      !isEmpty(installManifests),
    hasLintJobs: ({context: {lintQueue}}) => !isEmpty(lintQueue),
    hasPackJobs: ({context: {packQueue}}) => !isEmpty(packQueue),
    hasRunScriptJobs: ({context: {runScriptQueue}}) => !isEmpty(runScriptQueue),
    hasTempDir: ({context: {tmpdir}}) => Boolean(tmpdir),
    isAborted: ({context: {aborted}}) => Boolean(aborted),
    isBootstrapped: and(['hasContext', 'hasTempDir']),
    isImmediateMode: ({context: {immediate}}) => Boolean(immediate),
    isInstallationComplete: and([
      'hasInstallManifests',
      not('hasInstallJobs'),
      'isPackingComplete',
      ({context: {installManifests = [], installResults = []}}) =>
        installResults.length === installManifests.length,
    ]),
    isLintingComplete: ({
      context: {ruleResultMap, rules = [], workspaceInfo},
    }) => {
      return (
        ruleResultMap.size === workspaceInfo.length &&
        [...ruleResultMap.values()].every(
          (result) => result.size === rules.length,
        )
      );
    },
    isPackingComplete: and([
      not('hasPackJobs'),
      ({context: {additionalDeps, installManifests = [], workspaceInfo}}) =>
        installManifests.length ===
        additionalDeps.length + workspaceInfo.length,
    ]),
    isRunningComplete: and([
      'isInstallationComplete',
      'shouldRunScripts',
      ({context: {runScriptResults = [], scripts = [], workspaceInfo}}) => {
        return (
          !isEmpty(runScriptResults) &&
          workspaceInfo.length * scripts.length === runScriptResults.length
        );
      },
    ]),
    nothingToDo: ({context: {workspaceInfo}}) => isEmpty(workspaceInfo),
    shouldLinger: and([
      'hasTempDir',
      'hasContext',
      ({context: {linger}}) => Boolean(linger),
    ]),
    shouldLint: ({context: {rules, shouldLint}}) =>
      shouldLint && !isEmpty(rules),
    shouldPruneTempDir: and([
      'hasTempDir',
      'hasContext',
      ({context: {linger}}) => !linger,
    ]),
    shouldRunScripts: ({context: {scripts}}) => !isEmpty(scripts),
    shouldShutdown: ({context: {shouldShutdown}}) => shouldShutdown,
  },
  types: {
    context: {} as PkgManagerMachineContext,
    events: {} as PkgManagerMachineEvent,
    input: {} as PkgManagerMachineInput,
    output: {} as PkgManagerMachineOutput,
  },
}).createMachine({
  context: ({
    input: {
      additionalDeps = [],
      envelope,
      opts: {loose = false, verbose = false} = {},
      ruleEnvelopes = [],
      shouldLint = false,
      shouldShutdown = false,
      workspaceInfo,
      ...input
    },
  }) => {
    const props = {
      installQueue: [],
      lintQueue: [],
      opts: {loose, verbose},
      packQueue: [...workspaceInfo],
      pkgManager: envelope.pkgManager,
      plugin: envelope.plugin,
      ruleResultMap: new Map(),
      rules: map(ruleEnvelopes, 'rule'),
      runScriptActorRefs: {},
      runScriptQueue: [],
      spec: serialize(envelope.spec),
      workspaceInfoResult: workspaceInfo.map(asResult),
    } satisfies Partial<PkgManagerMachineContext>;

    return {
      ...input,
      additionalDeps,
      envelope,
      ruleEnvelopes,
      shouldLint,
      shouldShutdown,
      workspaceInfo,
      ...props,
    };
  },
  entry: [
    INIT_ACTION,
    log(({context: {scripts, shouldLint, spec, workspaceInfo}}) => {
      let msg = `💡 PkgManagerMachine ${spec.label} starting up with ${workspaceInfo.length} workspace(s)`;
      if (shouldLint) {
        msg += '; will lint';
      }
      if (!isEmpty(scripts)) {
        msg += '; will run scripts';
      }
      return msg;
    }),
  ],
  exit: [
    log(
      ({
        context: {
          spec: {label: spec},
        },
      }) => `🛑 PkgManagerMachine for ${spec} stopped`,
    ),
  ],
  id: 'PkgManagerMachine',
  initial: 'idle',
  on: {
    ABORT: {
      actions: [
        log(({context: {error}}) =>
          error ? `❌ ERROR: ${error?.message}` : 'aborting',
        ),
        'stopAllChildren',
        'aborted',
      ],
      guard: not('isAborted'),
      target: '.shutdown',
    },
  },
  output: ({
    context: {aborted, error, workspaceInfo},
    self: {id},
  }): PkgManagerMachineOutput => {
    const noop = isEmpty(workspaceInfo);
    return error
      ? {aborted, actorId: id, error, noop, type: ERROR}
      : {aborted: false, actorId: id, noop, type: OK};
  },
  states: {
    done: {
      type: FINAL,
    },
    idle: {
      always: [
        {
          guard: 'nothingToDo',
          target: 'done',
        },
        {
          guard: 'isImmediateMode',
          target: 'startup',
        },
      ],
      on: {
        BEGIN: 'startup',
      },
    },
    shutdown: {
      initial: 'gate',
      onDone: 'done',
      states: {
        cleanupFilesystem: {
          description: 'Prunes temp dir',
          invoke: {
            input: ({context: {fileManager, tmpdir}}) => {
              assert.ok(tmpdir);
              return {
                fileManager,
                tmpdir,
              };
            },
            onDone: {
              actions: [
                log(
                  ({context: {tmpdir}}) => `💥 Annihilated temp dir: ${tmpdir}`,
                ),
              ],
              target: 'teardownLifecycle',
            },
            onError: {
              actions: [
                {
                  params: ({
                    context: {
                      pkgManager: {spec},
                      tmpdir,
                    },
                    event: {error},
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
                  type: 'assignError',
                },
              ],
              target: 'teardownLifecycle',
            },
            src: 'pruneTempDir',
          },
        },
        done: {
          type: FINAL,
        },
        errored: {
          type: FINAL,
        },
        gate: {
          always: [
            {
              guard: 'shouldPruneTempDir',
              target: 'cleanupFilesystem',
            },
            {
              actions: [
                log(
                  ({context: {tmpdir}}) =>
                    `📁 Leaving temp dir to linger: ${tmpdir}`,
                ),
                'sendLingered',
              ],
              guard: 'shouldLinger',
              target: 'teardownLifecycle',
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
        teardownLifecycle: {
          description: 'Runs teardown() of PkgManager, if any',
          entry: log(`🔽 Running teardown lifecycle hook`),
          invoke: {
            input: ({context: {ctx, pkgManager}}) => {
              assert.ok(ctx);
              return {
                ctx,
                pkgManager,
              };
            },
            onDone: 'done',
            onError: {
              actions: [
                {
                  params: ({
                    context: {
                      plugin,
                      spec: {label: spec},
                    },
                    event: {error},
                  }) => ({
                    error: new LifecycleError(
                      error,
                      'teardown',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  }),
                  type: 'assignError',
                },
              ],
              target: 'errored',
            },
            src: 'teardownPkgManager',
          },
        },
      },
    },
    startup: {
      initial: 'init',
      onDone: 'working',
      states: {
        done: {
          type: FINAL,
        },
        errored: {
          entry: 'abort',
          type: FINAL,
        },
        init: {
          description:
            'Initial creation of PkgManager context object. If anything fails here, the machine aborts',
          invoke: {
            input: ({context: {fileManager, spec}}) => ({
              fileManager,
              spec,
            }),
            onDone: {
              actions: [
                {
                  params: ({event: {output}}) => output,
                  type: 'assignTmpdir',
                },
                log(({event: {output}}) => `📁 Created temp dir: ${output}`),
                'createPkgManagerContext',
              ],
              target: 'setupLifecycle',
            },
            onError: {
              actions: [
                {
                  params: ({context: {spec}, event: {error}}) => ({
                    error: new TempDirError(
                      `Package manager ${spec.label} could not create a temp dir`,
                      spec,
                      fromUnknownError(error),
                    ),
                  }),
                  type: 'assignError',
                },
              ],
              target: 'errored',
            },
            src: 'createTempDir',
          },
        },
        setupLifecycle: {
          entry: [log('🔼 Running setup lifecycle hook')],
          invoke: {
            input: ({context: {ctx, pkgManager}}) => {
              assert.ok(ctx, 'Expected a PackageManagerContext');
              return {
                ctx,
                pkgManager,
              };
            },
            onDone: 'done',
            onError: {
              actions: [
                {
                  params: ({
                    context: {
                      plugin,
                      spec: {label: spec},
                    },
                    event: {error},
                  }) => ({
                    error: new LifecycleError(
                      error,
                      'setup',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  }),
                  type: 'assignError',
                },
              ],
              target: 'errored',
            },
            src: 'setupPkgManager',
          },
        },
      },
    },
    working: {
      description:
        'This is where most things happen. As soon as a pkg is packed, it will be installed. As soon as it is installed, we can lint or run scripts; this all happens in parallel',
      // we can start installing additional deps as soon as we have a tmpdir
      entry: 'enqueueAdditionalDeps',
      onDone: [
        {
          actions: [log('🏁 Work complete; shutting down')],
          guard: 'shouldShutdown',
          target: 'shutdown',
        },
        {
          actions: log('⏪ Work complete; returning to idle'),
          target: 'idle',
        },
      ],
      states: {
        installing: {
          description:
            'Installs tarballs and additional deps in serial. If anything operation throws or rejects in this state, the machine will abort',
          exit: ['freeInstallError'],
          initial: 'idle',
          states: {
            done: {
              entry: [
                log(
                  ({context: {installManifests = []}}) =>
                    `🟢 Installation of ${installManifests.length} package(s) complete`,
                ),
              ],
              type: FINAL,
            },
            errored: {
              entry: [log('🔴 Installation errored; aborting'), 'abort'],
              type: FINAL,
            },
            idle: {
              always: {
                guard: 'hasInstallJobs',
                target: 'installingPkgs',
              },
              description:
                'Waits until install jobs are available, then transitions to next state',
            },
            installingPkgs: {
              entry: 'sendPkgManagerInstallBegin',
              exit: 'sendPkgManagerInstallEnd',
              initial: 'installPkg',
              onDone: [
                {
                  guard: 'hasInstallError',
                  target: 'errored',
                },
                {
                  target: 'done',
                },
              ],
              states: {
                done: {
                  type: FINAL,
                },
                errored: {
                  type: FINAL,
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
                installPkg: {
                  entry: ['takeInstallJob', 'sendPkgInstallBegin'],
                  invoke: {
                    input: ({
                      context: {ctx, currentInstallJob, envelope},
                    }): InstallLogicInput => {
                      assert.ok(currentInstallJob);
                      assert.ok(ctx);

                      return {
                        ctx: {
                          ...ctx,
                          installManifest: currentInstallJob,
                        },
                        envelope,
                      };
                    },
                    onDone: {
                      actions: [
                        // TODO combine?
                        {
                          params: ({event: {output}}) => output,
                          type: 'sendPkgInstallOk',
                        },
                        {
                          params: ({event: {output}}) => output,
                          type: 'appendInstallResult',
                        },
                        {
                          params: ({event: {output}}) => output,
                          type: 'handleInstallResult',
                        },
                      ],
                      target: 'installedPkg',
                    },
                    onError: {
                      actions: {
                        params: ({event: {error}}) =>
                          error as AbortError | InstallError,
                        type: 'handleInstallFailure',
                      },
                      target: 'errored',
                    },

                    src: 'install',
                  },
                },
              },
            },
          },
        },
        linting: {
          initial: 'idle',
          on: {
            CHECK_ERROR: {
              actions: [
                {
                  params: ({
                    event: {
                      output: {error},
                    },
                  }) => error,
                  type: 'assignRuleError',
                },
                {
                  params: ({event: {output}}) => output,
                  type: 'sendRuleEnd',
                },
              ],
              description:
                'If a rule check implementation throws or rejects, this event will be sent by a RuleMachine',
            },
            CHECK_RESULT: {
              actions: [
                log(
                  ({
                    event: {
                      output: {
                        manifest: {pkgName},
                        ruleId,
                        type,
                      },
                    },
                  }) =>
                    `✅ Executed rule ${ruleId} against ${pkgName} (${type})`,
                ),
                {
                  params: ({event: {output}}) => output,
                  type: 'updateRuleResultMap',
                },
                {
                  params: ({event: {output}}) => output,
                  type: 'sendRuleEnd',
                },
              ],
              description:
                'Once a RuleMachine has completed a rule check successfully, it will send this event',
            },
            LINT: {
              actions: [
                {
                  params: ({context: {fileManager}, event}) => ({
                    fileManager,
                    ...event,
                  }),
                  type: 'spawnPrepareLintManifest',
                },
              ],
            },
            'xstate.done.actor.prepareLintManifest.*': {
              actions: [
                {
                  params: ({event: {output}}) => output,
                  type: 'appendLintManifest',
                },
              ],
            },
            'xstate.error.actor.prepareLintManifest.*': {
              actions: [
                {
                  params: ({event: {error}}) => ({error}),
                  type: 'assignError',
                },
              ],
            },
          },
          states: {
            done: {
              entry: [log('🟢 Linting complete without error'), 'freeRuleData'],
              type: FINAL,
            },
            errored: {
              entry: [
                log(({context: {error}}) => {
                  assert.ok(error);
                  return `🔴 Linting errored with: ${error.message}`;
                }),
                'sendPkgManagerLintEnd',
                'freeRuleData',
              ],
              type: FINAL,
            },
            idle: {
              always: [
                {
                  actions: ['sendPkgManagerLintBegin', 'assignRuleMachineRefs'],
                  guard: and(['shouldLint', 'hasLintJobs']),
                  target: 'lintingPkgs',
                },
                {
                  guard: not('shouldLint'),
                  target: 'noop',
                },
              ],
              description:
                'If the `lint` flag was not passed into the Smoker options, we can exit early',
            },
            lintingPkgs: {
              always: [
                {
                  actions: 'lint',
                  guard: 'hasLintJobs',
                  target: 'lintingPkgs',
                },
                {
                  actions: 'sendPkgManagerLintEnd',
                  guard: 'isLintingComplete',
                  target: 'done',
                },
                // TODO this doesn't seem right
                {
                  actions: 'sendPkgManagerLintEnd',
                  guard: 'hasError',
                  target: 'errored',
                },
              ],
            },
            noop: {
              entry: [log('🟡 Linting skipped'), 'freeRuleData'],
              type: FINAL,
            },
          },
        },
        packing: {
          description:
            'Packs chosen workspaces in parallel. If an error occurs in this state, the machine will abort',
          exit: 'freePackError',
          initial: 'idle',
          states: {
            done: {
              entry: [
                log(
                  ({context: {workspaceInfo}}) =>
                    `🟢 Packing of ${workspaceInfo.length} workspace(s) completed successfully`,
                ),
                'sendPkgManagerPackEnd',
              ],
              type: FINAL,
            },
            errored: {
              entry: [
                log('🔴 Packing failed miserably'),
                'sendPkgManagerPackEnd',
                'abort',
              ],
              type: FINAL,
            },
            idle: {
              always: 'packingPkgs',
              description: 'Sends PackBegin and gets to packing',
              entry: 'sendPkgManagerPackBegin',
            },
            packingPkgs: {
              always: [
                {
                  guard: 'isPackingComplete',
                  target: 'done',
                },
                {
                  actions: [
                    log(
                      ({context: {packQueue}}) =>
                        `📦 Packing pkg "${head(packQueue)!.pkgName}"`,
                    ),
                    'spawnPackActor',
                    'pkgPackBegin',
                  ],
                  guard: 'hasPackJobs',
                  target: 'packingPkgs',
                },
              ],
              on: {
                'xstate.done.actor.pack.*': {
                  // TODO: combine
                  actions: [
                    {
                      params: ({event: {output}}) => output,
                      type: 'appendInstallManifest',
                    },
                    {
                      params: ({event: {output}}) => output,
                      type: 'sendPkgPackOk',
                    },
                    {
                      params: ({event: {actorId}}) => actorId,
                      type: 'stopPackActor',
                    },
                  ],
                },
                'xstate.error.actor.pack.*': {
                  actions: [
                    {
                      params: ({event: {error}}) => error,
                      type: 'handlePackFailure',
                    },
                    {
                      params: ({event: {actorId}}) => actorId,
                      type: 'stopPackActor',
                    },
                  ],
                  target: 'errored',
                },
              },
            },
          },
        },
        runningScripts: {
          initial: 'idle',
          states: {
            done: {
              entry: [
                log('🟢 Running scripts completed without error'),
                'sendPkgManagerRunScriptsEnd',
              ],
              type: FINAL,
            },
            errored: {
              entry: [
                log(({context: {error}}) => {
                  assert.ok(error);
                  return `🔴 Running scripts errored with: ${error.message}`;
                }),
                'sendPkgManagerRunScriptsEnd',
              ],
              type: FINAL,
            },
            idle: {
              always: [
                {
                  guard: not('shouldRunScripts'),
                  target: 'noop',
                },
              ],
              description:
                'A list of scripts should be provided within the machine input; if it is empty, we can exit early',
              on: {
                RUN_SCRIPT: {
                  actions: [
                    {
                      params: ({event: {manifest}}) => manifest,
                      type: 'appendRunScriptManifest',
                    },
                  ],
                  guard: 'shouldRunScripts',
                  target: 'running',
                },
              },
            },
            noop: {
              entry: [log('🤷 No scripts to run')],
              type: FINAL,
            },
            running: {
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
                {
                  actions: [
                    log(({context: {runScriptQueue = []}}) => {
                      const job = head(runScriptQueue);
                      const {pkgName = 'unknown', script = 'unknown'} =
                        job ?? {};
                      return `🐴 Running script "${script}" in package "${pkgName}"`;
                    }),
                    'spawnRunScript',
                    'sendRunScriptBegin',
                  ],
                  guard: 'hasRunScriptJobs',
                },
                {
                  guard: 'isRunningComplete',
                  target: 'done',
                },
              ],
              entry: [
                log(
                  ({
                    context: {
                      scripts: {length: scriptCount} = [],
                      workspaceInfo: {length: workspaceCount},
                    },
                  }) => {
                    return `🏇 Running ${scriptCount} script(s) in ${workspaceCount} package(s)`;
                  },
                ),
                'sendPkgManagerRunScriptsBegin',
              ],
              on: {
                RUN_SCRIPT: {
                  actions: [
                    {
                      params: ({event: {manifest}}) => manifest,
                      type: 'appendRunScriptManifest',
                    },
                  ],
                },
                'xstate.done.actor.runScript.*': {
                  actions: {
                    params: ({event: {output}}) => output,
                    type: 'handleRunScriptResult',
                  },
                  target: 'running',
                },
                'xstate.error.actor.runScript.*': {
                  actions: [
                    {
                      params: ({event: {error}}) => ({error}),
                      type: 'assignError',
                    },
                  ],
                  description: 'This is unlikely',
                  target: 'errored',
                },
              },
            },
          },
        },
      },
      type: PARALLEL,
    },
  },
});
