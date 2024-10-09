import type * as Event from '#machine/event';
import type * as Schema from '#schema/meta/for-smoke-machine';

import * as Const from '#constants';
import {Events} from '#constants/event';
import * as Err from '#error/meta/for-smoke-machine';
import {
  type AbortedEventData,
  type SmokeResults,
  type SmokeResultsError,
  type SmokeResultsFailed,
  type SmokeResultsOk,
} from '#event/core-events';
import {type EventData} from '#event/events';
import {
  queryWorkspacesLogic,
  type QueryWorkspacesLogicInput,
} from '#machine/actor/query-workspaces';
import {
  readSmokerPkgJsonLogic,
  type ReadSmokerPkgJsonLogicInput,
} from '#machine/actor/read-smoker-pkg-json';
import * as Bus from '#machine/bus';
import {
  ComponentLoaderMachine,
  type ComponentLoaderMachineOutput,
  LoadableComponents,
} from '#machine/component-loader-machine';
import {
  PkgManagerMachine,
  type PkgManagerMachineBeginEvent,
  type PkgManagerMachineOutput,
} from '#machine/pkg-manager-machine';
import {
  ReporterMachine,
  type ReporterMachineInput,
  type ReporterMachineOutput,
} from '#machine/reporter-machine';
import * as MUtil from '#machine/util';
import * as Envelope from '#plugin/component-envelope';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PluginRegistry} from '#plugin/registry';
import {type PackageJson} from '#schema/package-json';
import * as assert from '#util/assert';
import {hrRelativePath} from '#util/format';
import {isActorOutputNotOk, isActorOutputOk} from '#util/guard/actor-output';
import {assertActorOutputNotOk} from '#util/guard/assert/actor-output';
import * as Util from '#util/meta/for-smoke-machine';
import {compact, isEmpty, map} from 'lodash';
import {type EventEmitter} from 'node:events';
import {type ValueOf} from 'type-fest';
import {
  type ActorRefFrom,
  and,
  assign,
  enqueueActions,
  log,
  not,
  raise,
  setup,
} from 'xstate';

/**
 * Prop names for bus actors on {@link SmokeMachineContext}
 *
 * @internal
 */
type BusActorProp = ValueOf<typeof BusActorMap>;

/**
 * Output of a {@link SmokeMachine}
 */
export type SmokeMachineOutput =
  | SmokeMachineOutputError
  | SmokeMachineOutputFailed
  | SmokeMachineOutputOk;

/**
 * Output of a {@link SmokeMachine} when an error occurs
 *
 * The results may or may not reflect a failure.
 */
export type SmokeMachineOutputError = MUtil.ActorOutputError<
  Error,
  CommonSmokeMachineOutput & SmokeResults
>;

/**
 * Output of a {@link SmokeMachine} when something fails (lint, script)
 */
export type SmokeMachineOutputFailed = {
  type: typeof Const.FAILED;
} & CommonSmokeMachineOutput &
  SmokeResultsFailed;

/**
 * Output of a {@link SmokeMachine} when no error occurs
 */
export type SmokeMachineOutputOk = MUtil.ActorOutputOk<
  CommonSmokeMachineOutput & SmokeResultsOk
>;

/**
 * Properties common to any type of {@link SmokeMachineOutput}
 */
interface CommonSmokeMachineOutput {
  /**
   * If the machine has aborted, this will be `true`.
   */
  aborted?: boolean;

  /**
   * Actor ID
   */
  actorId: string;

  /**
   * If no scripts nor linting occurred, this will be `true`.
   */
  noop?: boolean;
}

/**
 * Context for {@link SmokeMachine}
 */
export interface SmokeMachineContext extends SmokeMachineInput {
  /**
   * Whether or not the machine has aborted
   */
  aborted?: boolean;

  /**
   * An abort reason; assigned if the ABORT event is emitted. Will be emitted w/
   * event type {@link Events.AbortEvent} when {@link canAbort} is `true`
   */
  abortReason?: AbortedEventData;

  /**
   * If true, the machine can abort. We want to wait until we have reporters, if
   * possible.
   */
  canAbort?: boolean;

  /**
   * Default executor provided to {@link PkgManagerMachine PkgManagerMachines}
   * which uses `corepack` to run package manager executables.
   *
   * {@see {@link https://npm.im/corepack}}
   */
  defaultExecutor: Schema.Executor;

  /**
   * If anything errors, it will end up aggregated into here.
   */
  error?: Err.MachineError;

  /**
   * `FileManager` instance
   */
  fileManager: Util.FileManager;

  /**
   * Reference to an {@link Bus.InstallBusMachine InstallBusMachine}
   */
  installBusMachineRef?: ActorRefFrom<typeof Bus.InstallBusMachine>;

  /**
   * List of directories which should be left behind after process completion
   * (if any)
   */
  lingered?: string[];

  /**
   * Reference to a {@link Bus.LintBusMachine LintBusMachine}
   */
  lintBusMachineRef?: ActorRefFrom<typeof Bus.LintBusMachine>;

  /**
   * Results of linting workspaces
   *
   * Component of {@link SmokeMachineOutput}
   */
  lintResults?: Schema.LintResult[];

  /**
   * Mapping of actor ID to {@link ComponentLoaderMachine} reference; one per
   * plugin
   */
  loaderMachineRef?: ActorRefFrom<typeof ComponentLoaderMachine>;

  narrowedAdditionalDeps?: readonly string[];

  /**
   * Reference to a {@link Bus.PackBusMachine PackBusMachine}
   */
  packBusMachineRef?: ActorRefFrom<typeof Bus.PackBusMachine>;

  /**
   * Temporary; package manager initialization payloads from the
   * {@link ComponentLoaderMachine}
   */
  pkgManagerEnvelopes?: Envelope.PkgManagerEnvelope[];

  /**
   * Mapping of actor ID to {@link PkgManagerMachine} reference
   */
  pkgManagerMachineRefs?: Record<
    string,
    ActorRefFrom<typeof PkgManagerMachine>
  >;

  /**
   * Output of {@link PkgManagerMachine}s.
   *
   * Used in determining when we are "done"
   */
  pkgManagerMachinesOutput?: PkgManagerMachineOutput[];

  /**
   * For convenience; static package manager specs for each enabled
   * `PkgManager`.
   */
  pkgManagers?: Schema.StaticPkgManagerSpec[];

  /**
   * Temporary; reporter initialization payloads from the
   * {@link ComponentLoaderMachine}
   */
  reporterEnvelopes?: Envelope.ReporterEnvelope[];

  /**
   * Mapping of actor ID to {@link ReporterMachine} reference; one per enabled
   * reporter
   */
  reporterMachineRefs?: Record<string, ActorRefFrom<typeof ReporterMachine>>;

  result?: SmokeResults;

  /**
   * Temporary; rule initialization payloads from the
   * {@link ComponentLoaderMachine}
   */
  ruleEnvelopes?: Envelope.RuleEnvelope[];

  /**
   * Results of running custom scripts.
   *
   * Component of {@link SmokeMachineOutput}
   */
  runScriptResults?: Schema.RunScriptResult[];

  /**
   * Reference to a {@link Bus.ScriptBusMachine ScriptBusMachine}
   */
  scriptBusMachineRef?: ActorRefFrom<typeof Bus.ScriptBusMachine>;

  /**
   * {@inheritDoc SmokeMachineInput.shouldShutdown}
   */
  shouldShutdown: boolean;

  /**
   * Contents of our own `package.json`
   *
   * Used in `RuleContext` objects when linting
   */
  smokerPkgJson?: PackageJson;

  /**
   * Timestamp; when the machine started
   */
  startTime: number;

  /**
   * Convenience; static plugin information for each plugin
   */
  staticPlugins: Schema.StaticPluginMetadata[];

  /**
   * The "system" {@link Executor} which will invoke a package manager in the
   * user's `PATH`
   */
  systemExecutor: Schema.Executor;

  systemPkgManagerEnvelopes?: WeakMap<
    Readonly<PluginMetadata>,
    Envelope.PkgManagerEnvelope[]
  >;

  /**
   * {@link Schema.WorkspaceInfo Information} about workspaces
   */
  workspaceInfo?: Schema.WorkspaceInfo[];
}

/**
 * Input for {@link SmokeMachine}
 */
export interface SmokeMachineInput {
  auxEmitter?: EventEmitter;

  /**
   * Default {@link Schema.Executor}
   */
  defaultExecutor: Schema.Executor;

  /**
   * Custom {@link FileManager}
   */
  fileManager?: Util.FileManager;

  /**
   * Plugin registry
   */
  pluginRegistry: PluginRegistry;

  /**
   * If `true`, the machine should shutdown after completing its work
   */
  shouldShutdown?: boolean;

  /**
   * Smoker options
   */
  smokerOptions: Schema.SmokerOptions;

  /**
   * System {@link Schema.Executor}
   */
  systemExecutor: Schema.Executor;
}

/**
 * Mapping of actor ID to actor reference prop in {@link SmokeMachineContext}.
 *
 * Used for various actions performing common tasks on bus machines.
 */
const BusActorMap = Util.constant({
  InstallBusMachine: 'installBusMachineRef',
  LintBusMachine: 'lintBusMachineRef',
  PackBusMachine: 'packBusMachineRef',
  ScriptBusMachine: 'scriptBusMachineRef',
});

/**
 * Main state machine for the `midnight-smoker` application.
 *
 * Prior to this, plugins should already have been registered with the
 * {@link PluginRegistry}.
 *
 * @internal
 */
export const SmokeMachine = setup({
  actions: {
    /**
     * Raises an {@link Event.AbortEvent AbortEvent}.
     */
    abort: raise({type: 'ABORT'}),

    /**
     * Sets {@link SmokeMachineContext.aborted} to `true`.
     */
    aborted: assign({aborted: true}),

    /**
     * Before a {@link PkgManagerMachine} exits, it should emit an event with its
     * tmpdir _if and only if_ the `linger` flag was set to `true`.
     *
     * If this is non-empty, then the `Lingered` event will be emitted just
     * before the `BeforeExit` event.
     */
    appendLingered: assign({
      lingered: ({context: {lingered = []}}, directory: string) => [
        ...lingered,
        directory,
      ],
    }),

    /**
     * Appends a {@link PkgManagerMachineOutput} to
     * {@link SmokeMachineContext.pkgManagerMachinesOutput pkgManagerMachinesOutput}
     * (which is for tracking which {@link PkgManagerMachine PkgManagerMachines}
     * have completed)
     */
    appendPkgManagerMachineOutput: assign({
      pkgManagerMachinesOutput: (
        {context: {pkgManagerMachinesOutput = []}},
        output: PkgManagerMachineOutput,
      ) => [...pkgManagerMachinesOutput, output],
    }),

    /**
     * Once the {@link Bus.ScriptBusMachine} emits `RunScriptsOk` or
     * `RunScriptsFailed`, we retain the results for output
     * ({@link SmokeMachineOutput})
     */
    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: Schema.RunScriptResult,
      ) => [...runScriptResults, runScriptResult],
    }),

    /**
     * Creates or updates an aggregate {@link SmokerError}.
     *
     * If an aggregate {@link Err.MachineError} is passed, the errors within it
     * will be dereferenced.
     */
    assignError: assign({
      error: ({context, self}, error: Error | Error[]) => {
        if (Util.isSmokerError(Err.MachineError, error)) {
          error = error.errors;
        }
        if (context.error) {
          return context.error.cloneWith(error);
        }
        return new Err.MachineError('Fatal error', error, self.id);
      },
    }),

    /**
     * Overwrite lint results
     */
    assignLintResults: assign({
      lintResults: (_, lintResults: Schema.LintResult[]) => lintResults,
    }),

    assignSmokeResults: assign({
      result: ({
        context: {
          error,
          lintResults = [],
          pkgManagers = [],
          runScriptResults = [],
          smokerOptions,
          staticPlugins,
          workspaceInfo = [],
        },
      }): SmokeResults => {
        // scripts which had a failure
        const scriptsFailed = runScriptResults.filter(
          ({type}) => type === Const.FAILED,
        ) as Schema.RunScriptResultFailed[];

        // rules which had a failure
        const lintFailed = lintResults.filter(
          ({type}) => type === Const.FAILED,
        ) as Schema.LintResultFailed[];

        // if any failed lint rule has severity of `error` then `success` is
        // false and we should exit with a nonzero code
        const severityIsError = lintFailed.some(({results}) =>
          results.some(
            ({ctx, type}) =>
              type === Const.FAILED &&
              ctx.severity === Const.RuleSeverities.Error,
          ),
        );

        /**
         * If `true`, something was amiss
         *
         * This is _not_ the opposite of {@link success}
         */
        const failureOrWarning = Boolean(
          scriptsFailed.length || lintFailed.length,
        );

        /**
         * If `false`, we should exit with a non-zero exit code
         *
         * This is _not_ the opposite of {@link failureOrWarning}
         */
        const success = !severityIsError && !scriptsFailed.length;

        const baseSmokeResult = {
          lint: lintResults,
          pkgManagers,
          plugins: staticPlugins,
          scripts: runScriptResults,
          smokerOptions,
          success,
          workspaceInfo: workspaceInfo.map(Util.asResult),
        };

        if (error) {
          return {
            ...baseSmokeResult,
            error: new Err.SmokeError(error),
            type: Const.ERROR,
          } as SmokeResultsError;
        }
        if (failureOrWarning) {
          return {
            ...baseSmokeResult,
            lintFailed,
            scriptsFailed,
            type: Const.FAILED,
          } as SmokeResultsFailed;
        }
        return {...baseSmokeResult, type: Const.OK} as SmokeResultsOk;
      },
    }),

    /**
     * Overwrites `smokerPkgJson` with the contents of our `package.json` file;
     * will be provided to {@link ReporterMachine}s upon spawn
     */
    assignSmokerPkgJson: assign({
      smokerPkgJson: (_, smokerPkgJson: PackageJson) => smokerPkgJson,
    }),

    /**
     * Assigns workspace info after {@link queryWorkspacesLogic} has completed.
     *
     * {@link SmokeMachineContext.uniquePkgsNames} is also cached here to safe a
     * few trips through the array.
     */
    assignWorkspaceInfo: assign({
      workspaceInfo: (_, workspaceInfo: Schema.WorkspaceInfo[]) =>
        workspaceInfo,
    }),

    /**
     * Generic action to free an event bus machine reference (and stop the
     * machine)
     */
    cleanupBusMachine: enqueueActions(
      ({context, enqueue}, prop: BusActorProp) => {
        const ref = context[prop];
        if (ref) {
          enqueue.stopChild(ref);
        }
        enqueue.assign({[prop]: undefined});
      },
    ),

    /**
     * Stops a {@link PkgManagerMachine}.
     *
     * The machine is already likely stopped, but this makes it explicit and
     * clears the reference.
     */
    cleanupPkgManagerMachine: enqueueActions(
      ({context: {pkgManagerMachineRefs = {}}, enqueue}, id: string): void => {
        enqueue.stopChild(id);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = pkgManagerMachineRefs;
        enqueue.assign({
          pkgManagerMachineRefs: rest,
        });
      },
    ),

    /**
     * After the init payloads have been used to spawn
     * {@link ReporterMachine ReporterMachines} and
     * {@link PkgManagerMachine PkgManagerMachines}, we can safely drop the data
     * from the context.
     */
    clearEnvelopes: assign({
      pkgManagerEnvelopes: [],
      reporterEnvelopes: [],
      ruleEnvelopes: [],
    }),

    /**
     * When a {@link ComponentLoaderMachine} is finished, this processes its
     * output.
     */
    componentLoaderMachineDoneHandler: enqueueActions(
      (
        {
          context: {
            pkgManagerEnvelopes = [],
            pkgManagers = [],
            reporterEnvelopes = [],
            ruleEnvelopes = [],
          },
          enqueue,
        },
        output: ComponentLoaderMachineOutput,
      ): void => {
        const {actorId: id} = output;
        if (isActorOutputOk(output)) {
          const {
            pkgManagerEnvelopes: newPkgManagerEnvelopes,
            reporterEnvelopes: newReporterEnvelopes,
            ruleEnvelopes: newRuleEnvelopes,
          } = output;
          const newPkgManagers = newPkgManagerEnvelopes.map(({spec}) =>
            Util.serialize(spec),
          );
          enqueue.assign({
            pkgManagerEnvelopes: [
              ...pkgManagerEnvelopes,
              ...newPkgManagerEnvelopes,
            ],
            pkgManagers: [...pkgManagers, ...newPkgManagers],
            reporterEnvelopes: [...reporterEnvelopes, ...newReporterEnvelopes],
            ruleEnvelopes: [...ruleEnvelopes, ...newRuleEnvelopes],
          });
        } else {
          // @ts-expect-error - TS sux
          enqueue({params: output.error, type: 'assignError'});
          // @ts-expect-error - TS sux
          enqueue({type: 'abort'});
        }
        // @ts-expect-error - TS sux
        enqueue({params: id, type: 'cleanupLoaderMachine'});
      },
    ),

    /**
     * Stops all `ReporterMachines`s.
     *
     * This action is taken as a last resort if the `ReporterMachine`s do not
     * shutdown gracefully before a timeout is exceeded.
     */
    destroyAllReporterMachines: enqueueActions(
      ({context: {reporterMachineRefs = {}}, enqueue}) => {
        for (const child of Object.values(reporterMachineRefs)) {
          enqueue.stopChild(child);
        }
        enqueue.assign({
          reporterMachineRefs: undefined,
        });
      },
    ),

    /**
     * Stops most children, including:
     *
     * - `PkgManagerMachine`
     * - `ComponentLoaderMachine`
     * - Any bus machines
     *
     * It _does not_ stop `ReporterMachine`s, because a) they may still have
     * events they need to emit, and b) the `SmokeMachine` still needs to emit
     * events during its shutdown process.
     *
     * @see `destroyAllReporterMachines` action
     */
    destroyMostChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      const stoppableChildren = Object.keys(snapshot.children).filter(
        (id) => !id.startsWith('ReporterMachine'),
      );
      for (const child of stoppableChildren) {
        enqueue.stopChild(child);
      }
      // TODO: this does not remove the references. does it matter?
    }),

    /**
     * Immediately after emitting `BeforeExit`, this tells the
     * `ReporterMachine`s to drain their event queues and begin its shutdown
     * procedure
     */
    flushReporters: enqueueActions(
      ({context: {reporterMachineRefs = {}}, enqueue, self}) => {
        Object.values(reporterMachineRefs).forEach((reporterMachine) => {
          enqueue.sendTo(reporterMachine, {type: 'HALT'});
          self.system._logger(`Sent HALT to ${reporterMachine.id}`);
        });
      },
    ),

    /**
     * Generic action to re-emit an event to a bus machine.
     *
     * Events generally come from the
     * {@link PkgManagerMachine PkgManagerMachines}, and are sent here (the
     * `SmokeMachine`). This forwards those events to the appropriate event bus
     * machine.
     *
     * In some cases, the `SmokeMachine` needs to take action based on the
     * events; this is _a_ reason why the events are not sent directly from
     * `PkgManagerMachine` to the bus machines.
     */
    forward: enqueueActions(
      (
        {context, enqueue, self},
        {
          event,
          prop,
        }: {
          event:
            | Bus.InstallBusMachineEvents
            | Bus.LintBusMachineEvents
            | Bus.PackBusMachineEvents
            | Bus.ScriptBusMachineEvent;
          prop: BusActorProp;
        },
      ) => {
        const ref = context[prop];
        assert.ok(ref, `Expected bus machine ref ${prop}`);
        enqueue.sendTo(ref, event);
        self.system._logger(`↪️ fwd: ${event.type}`);
      },
    ),

    /**
     * Generic action to send a {@link Event.ListenEvent} to a bus machine
     *
     * This also enables the `canAbort` flag, as the reporters should now be
     * ready to field the abort event.
     */
    initEventBusMachines: enqueueActions(
      ({
        context: {
          installBusMachineRef,
          lintBusMachineRef,
          packBusMachineRef,
          reporterMachineRefs = {},
          scriptBusMachineRef,
        },
        enqueue,
      }) => {
        for (const busRef of compact([
          packBusMachineRef,
          installBusMachineRef,
          lintBusMachineRef,
          scriptBusMachineRef,
        ])) {
          const evt: Bus.ListenEvent = {
            actorIds: Object.keys(reporterMachineRefs),
            type: 'LISTEN',
          };
          enqueue.sendTo(busRef, evt);
        }
        enqueue.assign({canAbort: true});
      },
    ),

    [MUtil.INIT_ACTION]: MUtil.DEFAULT_INIT_ACTION(),

    /**
     * This tries to narrow down any additional dep.
     *
     * The aim is to match the version as present in the dependencies of the
     * project. e.g., asking for an additional dep of `mocha` would use
     * `mocha@10.1.0` from the devDeps.
     *
     * Given an `installable` which is both a) a valid npm package name and b)
     * has no version specifier, determine the version to install.
     *
     * If the `package.json` within `cwd` contains the package of the same name,
     * we will use that version; otherwise we will use the `latest` tag. If
     * `installable` is not a package name at all, it passes thru verbatim.
     */
    narrowAdditionalDeps: assign({
      narrowedAdditionalDeps: ({
        context: {
          smokerOptions: {add: additionalDeps},
          workspaceInfo = [],
        },
      }) => Util.narrowInstallables(additionalDeps, workspaceInfo),
    }),

    /**
     * Sends an event directly to all of the reporter machines (not via a bus
     * machine)
     *
     * Also emits the same event.
     */
    report: enqueueActions(
      (
        {context: {reporterMachineRefs = {}}, enqueue, self},
        event: Event.SmokeMachineEventEmitted,
      ) => {
        enqueue.emit(event);
        for (const reporterMachineRef of Object.values(reporterMachineRefs)) {
          enqueue.sendTo(reporterMachineRef, {event, type: 'EVENT'});
        }
        self.system._logger(`📣 emit: ${event.type}`);
      },
    ),

    /**
     * Sends the `BEGIN` event to all `PkgManagerMachine`s, which should kickoff
     * packing.
     */
    sendPkgManagerBegin: enqueueActions(
      ({context: {pkgManagerMachineRefs = {}}, enqueue}) => {
        const evt: PkgManagerMachineBeginEvent = {type: 'BEGIN'};
        Object.values(pkgManagerMachineRefs).forEach((ref) => {
          enqueue.sendTo(ref, evt);
        });
      },
    ),

    /**
     * Assigns `true` to
     * {@link SmokeMachineContext.shouldShutdown shouldShutdown}.
     *
     * This does _not_ imply an immediate shutdown; it just tells the machine to
     * go ahead and shutdown after its work is complete.
     */
    shouldShutdown: assign({shouldShutdown: true}),

    /**
     * Spawns event bus machines; one per discrete operation (pack, install,
     * lint, run-scripts).
     *
     * Won't spawn if the operation is not requested.
     */
    spawnEventBusMachines: assign({
      installBusMachineRef: ({
        context: {pkgManagers = [], smokerOptions, workspaceInfo = []},
        self: parentRef,
        spawn,
      }) => {
        const input: Bus.InstallBusMachineInput = {
          parentRef,
          pkgManagers,
          smokerOptions,
          workspaceInfo,
        };
        const actor = spawn('InstallBusMachine', {
          id: 'InstallBusMachine',
          input,
          systemId: 'InstallBusMachine',
        });
        return MUtil.monkeypatchActorLogger(actor, 'InstallBusMachine');
      },
      lintBusMachineRef: ({
        context: {
          pkgManagers = [],
          ruleEnvelopes = [],
          smokerOptions,
          workspaceInfo = [],
        },
        self: parentRef,
        spawn,
      }) => {
        // refuse to spawn if we shouldn't be linting anyway
        if (!smokerOptions.lint) {
          return undefined;
        }
        const input: Bus.LintBusMachineInput = {
          parentRef,
          pkgManagers,
          ruleDefs: map(ruleEnvelopes, 'rule'),
          smokerOptions,
          workspaceInfo,
        };
        const actor = spawn('LintBusMachine', {
          id: 'LintBusMachine',
          input,
          systemId: 'LintBusMachine',
        });
        return MUtil.monkeypatchActorLogger(actor, 'LintBusMachine');
      },
      packBusMachineRef: ({
        context: {pkgManagers = [], smokerOptions, workspaceInfo = []},
        self: parentRef,
        spawn,
      }) => {
        const input: Bus.PackBusMachineInput = {
          parentRef,
          pkgManagers,
          smokerOptions,
          workspaceInfo,
        };
        const actor = spawn('PackBusMachine', {
          id: 'PackBusMachine',
          input,
          systemId: 'PackBusMachine',
        });
        return MUtil.monkeypatchActorLogger(actor, 'PackBusMachine');
      },
      scriptBusMachineRef: ({
        context: {pkgManagers = [], smokerOptions, workspaceInfo = []},
        self: parentRef,
        spawn,
      }) => {
        // refuse to spawn anything if there are no scripts requested
        if (isEmpty(smokerOptions.script)) {
          return undefined;
        }
        const input: Bus.ScriptBusMachineInput = {
          parentRef,
          pkgManagers,
          smokerOptions,
          workspaceInfo,
        };
        const actor = spawn('ScriptBusMachine', {
          id: 'ScriptBusMachine',
          input,
          systemId: 'ScriptBusMachine',
        });
        return MUtil.monkeypatchActorLogger(actor, 'ScriptBusMachine');
      },
    }),

    spawnPkgManagerMachines: assign({
      pkgManagerMachineRefs: ({
        context: {
          defaultExecutor,
          fileManager,
          narrowedAdditionalDeps = [],
          pkgManagerEnvelopes = [],
          pkgManagerMachineRefs,
          ruleEnvelopes = [],
          shouldShutdown,
          smokerOptions: {
            all,
            linger,
            lint: shouldLint,
            loose,
            rules,
            script: scripts,
            verbose,
            workspace,
          },
          systemExecutor,
          workspaceInfo = [],
        },
        self,
        spawn,
      }) => {
        const useWorkspaces = all || !isEmpty(workspace);

        const newRefs = Object.fromEntries(
          pkgManagerEnvelopes.map((envelope) => {
            const {pkgManager, plugin, spec} = envelope;
            const executor = spec.isSystem ? systemExecutor : defaultExecutor;
            const id = `PkgManagerMachine.[${plugin.id}/${pkgManager.name}]<${spec}>`;
            const actorRef = spawn('PkgManagerMachine', {
              id,
              input: {
                additionalDeps: narrowedAdditionalDeps,
                envelope,
                executor,
                fileManager,
                linger,
                opts: {loose, verbose},
                parentRef: self,
                ruleConfigs: rules,
                ruleEnvelopes,
                scripts,
                shouldLint,
                shouldShutdown,
                useWorkspaces,
                workspaceInfo,
              },
            });
            return [id, MUtil.monkeypatchActorLogger(actorRef, id)];
          }),
        );
        return {...pkgManagerMachineRefs, ...newRefs};
      },
    }),

    spawnReporterMachines: assign({
      reporterMachineRefs: ({
        context: {
          reporterEnvelopes = [],
          reporterMachineRefs = {},
          smokerOptions,
          smokerPkgJson = {
            description: "Failed to read midnight-smoker's package.json",
            name: 'midnight-smoker',
            version: '?.?.?',
          },
        },
        spawn,
      }) => {
        const newRefs = Object.fromEntries(
          reporterEnvelopes.map(({plugin, reporter}) => {
            const id = `ReporterMachine.[${plugin.id}/${reporter.name}]`;
            const input: ReporterMachineInput = {
              plugin,
              reporter,
              smokerOptions,
              smokerPkgJson,
            };
            const actor = spawn('ReporterMachine', {
              id,
              input,
              systemId: id,
            });
            return [id, MUtil.monkeypatchActorLogger(actor, id)];
          }),
        );
        return {...reporterMachineRefs, ...newRefs};
      },
    }),

    /**
     * Stops a single reporter machine.
     *
     * The machine is already likely stopped, but this makes it explicit and
     * clears the reference.
     */
    stopReporterMachine: enqueueActions(
      (
        {context: {reporterMachineRefs = {}}, enqueue},
        {output: {actorId: id}}: {output: ReporterMachineOutput},
      ) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = reporterMachineRefs;
        enqueue.assign({
          reporterMachineRefs: rest,
        });
      },
    ),

    /**
     * Compares package managers received by the `ComponentLoaderMachine`s
     * against those that were requested by the user, and aborts if any are
     * unsupported (missing).
     */
    validatePkgManagers: enqueueActions(
      ({
        context: {
          pkgManagerEnvelopes = [],
          smokerOptions: {pkgManager: desiredPkgManagers = []},
        },
        enqueue,
      }) => {
        const unsupportedPkgManagers =
          Envelope.filterUnsupportedPkgManagersFromEnvelopes(
            pkgManagerEnvelopes.map(({spec}) => spec),
            desiredPkgManagers,
          );

        for (const unsupported of unsupportedPkgManagers) {
          enqueue({
            // @ts-expect-error - TS sux
            params: new Err.UnsupportedPackageManagerError(
              `No package manager implementation found that can handle "${unsupported}"`,
              unsupported,
            ),
            type: 'assignError',
          });
        }

        // DO NOT ABORT HERE; we want to at least try to spawn reporters so they
        // can handle the error.
      },
    ),
  },
  actors: {
    ComponentLoaderMachine,
    InstallBusMachine: Bus.InstallBusMachine,
    LintBusMachine: Bus.LintBusMachine,
    PackBusMachine: Bus.PackBusMachine,
    PkgManagerMachine,
    queryWorkspaces: queryWorkspacesLogic,
    readSmokerPkgJson: readSmokerPkgJsonLogic,
    ReporterMachine,
    ScriptBusMachine: Bus.ScriptBusMachine,
  },
  guards: {
    /**
     * Returns `true` if _all_ workspaces found have the `private` flag in their
     * `package.json` files.
     */
    allPrivateWorkspaces: (
      {
        context: {
          smokerOptions: {allowPrivate},
        },
      },
      workspaceInfo: Schema.WorkspaceInfo[],
    ) =>
      !allowPrivate &&
      !isEmpty(workspaceInfo) &&
      workspaceInfo.every(({pkgJson}) => pkgJson.private),

    /**
     * Returns `true` if the machine doesn't have anything to do.
     */

    /**
     * Returns `true` if {@link SmokeMachineContext.error} is truthy.
     */
    hasError: ({context: {error}}) => !!error,

    /**
     * Returns `true` if the `lingered` context prop is a nonempty array.
     */
    hasLingered: ({context: {lingered}}) => !isEmpty(lingered),

    /**
     * Returns `true` if {@link SmokeMachineContext.loaderMachineRefs} has at
     * least one value
     */
    hasLoaderRef: ({context: {loaderMachineRef}}) => !isEmpty(loaderMachineRef),

    /**
     * Returns `true` if {@link SmokeMachineContext.error} is falsy.
     */
    hasNoError: not('hasError'),

    /**
     * Returns `true` if {@link SmokeMachineContext.reporterMachineRefs} has at
     * least one value
     */
    hasReporterRefs: ({context: {reporterMachineRefs}}) =>
      !isEmpty(reporterMachineRefs),

    /**
     * If `true`, then one or more custom scripts have been executed.
     */
    hasScriptResults: ({context: {runScriptResults}}) =>
      !isEmpty(runScriptResults),

    /**
     * Returns true if the `aborted` flag has been set.
     */
    isAborted: ({context: {aborted}}) => !!aborted,

    /**
     * Returns `true` if a machine's output is
     * {@link MUtil.ActorOutputError "not ok"}.
     */
    isMachineOutputNotOk: (_, output: MUtil.ActorOutput): boolean =>
      isActorOutputNotOk(output),

    /**
     * Returns `true` if a machine's output is {@link MUtil.ActorOutputOk "ok"}.
     */
    isMachineOutputOk: (_, output: MUtil.ActorOutput) =>
      isActorOutputOk(output),

    isNoop: and([not('shouldLint'), not('shouldRunScripts')]),

    /**
     * Returns `true` if work has completed.
     *
     * That means:
     *
     * 1. This machine is not aborted
     * 2. No {@link PkgManagerMachine} has aborted
     * 3. Every `PkgManagerMachine` has completed its work
     *
     * @todo Should we be checking the health of `ReporterMachine`s and bus
     *   machines?
     */
    isWorkComplete: and([
      not('isAborted'),
      ({context: {pkgManagerMachinesOutput = [], pkgManagers = []}}) =>
        !isEmpty(pkgManagerMachinesOutput) &&
        pkgManagers.length === pkgManagerMachinesOutput.length &&
        pkgManagerMachinesOutput.every(({aborted}) => !aborted),
    ]),

    /**
     * If `true`, then the `LINT` event was received.
     */
    shouldLint: ({
      context: {
        smokerOptions: {lint},
      },
    }) => lint,

    /**
     * If `true`, then the `RUN_SCRIPTS` event was received
     */
    shouldRunScripts: ({
      context: {
        smokerOptions: {script: scripts},
      },
    }) => !isEmpty(scripts),

    /**
     * If `true`, then either the `SHUTDOWN` event was received or it was set in
     * {@link SmokeMachineInput}.
     */
    shouldShutdown: ({context: {shouldShutdown}}) => shouldShutdown,
  },
  types: {
    context: {} as SmokeMachineContext,
    emitted: {} as Event.SmokeMachineEventEmitted,
    events: {} as Event.SmokeMachineEvent,
    input: {} as SmokeMachineInput,
    output: {} as SmokeMachineOutput,
  },
}).createMachine({
  always: {
    actions: [
      log('🚨 ABORTING!'),
      {
        params: ({context: {abortReason}}) => ({
          reason: abortReason,
          type: Events.Aborted,
        }),
        type: 'report',
      },
      'destroyMostChildren',
      'aborted',
    ],
    guard: and([
      not('isAborted'),
      ({context: {abortReason, canAbort}}) => Boolean(canAbort && abortReason),
    ]),
    target: '.shutdown',
  },
  context: ({
    input: {fileManager, shouldShutdown = false, smokerOptions, ...rest},
  }): SmokeMachineContext => {
    fileManager ??= Util.FileManager.create();
    const staticPlugins: SmokeMachineContext['staticPlugins'] = Util.serialize(
      rest.pluginRegistry.plugins,
    );
    const startTime: SmokeMachineContext['startTime'] = performance.now();

    return {
      ...rest,
      fileManager,
      shouldShutdown,
      smokerOptions,
      startTime,
      staticPlugins,
    };
  },
  entry: [MUtil.INIT_ACTION, log('Starting')],
  exit: [log('Stopped')],
  id: 'SmokeMachine',
  initial: 'init',
  on: {
    ABORT: {
      actions: [
        assign({
          abortReason: ({event: {reason}}) => ({reason}),
        }),
      ],
      description:
        'Creates & stores an abort event, which will cause the machine to abort asap',
      guard: not('isAborted'),
    },

    /**
     * @todo Move this to a child state, if possible
     */
    LINGERED: {
      actions: [
        {
          params: ({event: {directory}}) => directory,
          type: 'appendLingered',
        },
      ],
      description:
        'Only occurs if the `linger` flag was true. During its shutdown process, a PkgManagerMachine will emit this event with its tmpdir path',
    },

    SHUTDOWN: {
      actions: 'shouldShutdown',
      description:
        'Tells the machine to shutdown after finishing its work. Does NOT abort nor halt immediately',
    },

    // TODO: create action pkgManagerMachineDoneHandler
    'xstate.done.actor.PkgManagerMachine.*': [
      {
        actions: [
          {
            params: ({event: {output}}) => output,
            type: 'appendPkgManagerMachineOutput',
          },
          {
            params: ({event: {output}}) => output.actorId,
            type: 'cleanupPkgManagerMachine',
          },
          log(
            ({
              event: {
                output: {actorId: id},
              },
            }) => `${id} exited cleanly`,
          ),
        ],
        description:
          'Handles the case when a PkgManagerMachine exits w/o error',
        guard: {
          params: ({event: {output}}) => output,
          type: 'isMachineOutputOk',
        },
      },
      {
        actions: [
          {
            params: ({event: {output}}) => {
              assertActorOutputNotOk(output);
              return output.error;
            },
            type: 'assignError',
          },
          {
            params: ({event: {output}}) => output.actorId,
            type: 'cleanupPkgManagerMachine',
          },
          'abort',
        ],
        description: 'Handles the case when a PkgManagerMachine exits w/ error',
        guard: {
          params: ({event: {output}}) => output,
          type: 'isMachineOutputNotOk',
        },
      },
    ],

    'xstate.done.actor.ReporterMachine.*': [
      {
        actions: [
          {
            params: ({event: {output}}) => {
              assertActorOutputNotOk(output);
              return output.error;
            },
            type: 'assignError',
          },
          {params: ({event}) => event, type: 'stopReporterMachine'},
          'abort',
        ],
        description:
          'Handles the case when a ReporterMachine exits with an error',
        guard: {
          params: ({event: {output}}) => output,
          type: 'isMachineOutputNotOk',
        },
      },
      {
        actions: [
          log(
            ({
              event: {
                output: {actorId: id},
              },
            }) => `${id} exited cleanly`,
          ),
          {params: ({event}) => event, type: 'stopReporterMachine'},
        ],
        description:
          'Frees the ReporterMachine reference when a ReporterMachine exits cleanly',
        guard: {
          params: ({event: {output}}) => output,
          type: 'isMachineOutputOk',
        },
      },
    ],
  },
  output: ({
    context: {aborted, result, smokerOptions},
    self,
  }): SmokeMachineOutput => {
    const noop = !smokerOptions.lint && isEmpty(smokerOptions.script);
    assert.ok(result, 'Expected result');

    const commonOutput: CommonSmokeMachineOutput = {
      aborted,
      actorId: self.id,
      noop,
    };

    return {
      ...commonOutput,
      ...result,
    };
  },
  states: {
    init: {
      always: {
        guard: 'isNoop',
        target: 'noop',
      },
      entry: [log('Initializing environment and components')],
      initial: 'initializing',
      onDone: [
        {
          actions: [log('Refusing to pack!'), 'abort'],
          guard: 'hasError',
        },
        {target: 'working'},
      ],
      states: {
        done: {
          type: Const.FINAL,
        },

        initializing: {
          description:
            'Gathers information about the environment and spawns a ComponentLoaderMachine, which provides all enabled components',
          onDone: [
            {
              actions: log('Refusing to validate package managers!'),
              guard: 'hasError',
              target: 'spawningEventBusMachines',
            },
            {
              target: 'validatingPkgManagers',
            },
          ],
          states: {
            loadingComponents: {
              description: 'Gathers enabled component objects from each plugin',
              entry: log('Spawning ComponentLoaderMachine'),
              initial: 'loading',
              states: {
                done: {
                  type: Const.FINAL,
                },
                errored: {
                  entry: 'abort',
                  type: Const.FINAL,
                },
                loading: {
                  invoke: {
                    id: 'ComponentLoaderMachine',
                    input: ({
                      context: {
                        fileManager,
                        pluginRegistry,
                        smokerOptions,
                        workspaceInfo = [],
                      },
                    }) => ({
                      component: LoadableComponents.All,
                      fileManager,
                      pluginRegistry,
                      smokerOptions,
                      workspaceInfo,
                    }),
                    onDone: {
                      actions: [
                        log('ComponentLoaderMachine OK'),
                        {
                          params: ({event: {output}}) => output,
                          type: 'componentLoaderMachineDoneHandler',
                        },
                      ],
                      target: 'done',
                    },
                    onError: {
                      actions: [
                        log(
                          ({event: {error}}) =>
                            `ComponentLoaderMachine failed: ${error}`,
                        ),
                        {
                          // TODO: need a new SmokerError for this
                          params: ({event: {error}}) =>
                            Util.fromUnknownError(error),
                          type: 'assignError',
                        },
                      ],
                      target: 'errored',
                    },
                    src: 'ComponentLoaderMachine',
                  },
                },
              },
            },
            queryingWorkspaces: {
              description:
                'Gathers information about workspaces in cwd. If this is not a monorepo, we will only have a single workspace. The root workspace is ignored if we are working in a monorepo.',
              initial: 'queryWorkspaces',
              states: {
                done: {
                  type: Const.FINAL,
                },
                errored: {
                  entry: ['abort'],
                  type: Const.FINAL,
                },
                queryWorkspaces: {
                  description:
                    'Invokes the queryWorkspaces actor and assigns the results to the context',
                  invoke: {
                    id: 'queryWorkspaces',
                    input: ({
                      context: {
                        fileManager,
                        smokerOptions: {all, cwd, workspace},
                      },
                    }): QueryWorkspacesLogicInput => ({
                      all,
                      cwd,
                      fileManager,
                      workspace: [...workspace],
                    }),
                    onDone: [
                      {
                        actions: [
                          log(
                            ({
                              context: {
                                smokerOptions: {cwd},
                              },
                            }) =>
                              `All workspaces found within ${cwd} are private!`,
                          ),
                          {
                            params: ({
                              context: {
                                smokerOptions: {cwd},
                              },
                              event: {output},
                            }) =>
                              new Err.PrivateWorkspaceError(
                                `All workspaces found within ${hrRelativePath(
                                  cwd,
                                )} are private`,
                                cwd,
                                output,
                              ),
                            type: 'assignError',
                          },
                          'abort',
                        ],
                        guard: {
                          params: ({event: {output}}) => output,
                          type: 'allPrivateWorkspaces',
                        },
                        target: 'done',
                      },
                      {
                        actions: [
                          {
                            params: ({event: {output}}) => output,
                            type: 'assignWorkspaceInfo',
                          },
                          'narrowAdditionalDeps',
                          log(
                            ({event: {output}}) =>
                              `Found ${output.length} workspace(s)`,
                          ),
                        ],
                        target: 'done',
                      },
                    ],
                    onError: {
                      actions: [
                        {
                          // TODO: need a new SmokerError for this
                          params: ({event: {error}}) =>
                            Util.fromUnknownError(error),
                          type: 'assignError',
                        },
                      ],
                      target: 'errored',
                    },
                    src: 'queryWorkspaces',
                  },
                },
              },
            },
            readSmokerPkgJson: {
              initial: 'reading',
              states: {
                done: {
                  type: Const.FINAL,
                },
                errored: {
                  entry: 'abort',
                  type: Const.FINAL,
                },
                reading: {
                  description:
                    'Reads our own package.json file (for use by reporters)',
                  invoke: {
                    input: ({
                      context: {fileManager},
                    }): ReadSmokerPkgJsonLogicInput => ({fileManager}),
                    onDone: {
                      actions: [
                        {
                          params: ({event: {output}}) => output,
                          type: 'assignSmokerPkgJson',
                        },
                      ],
                      target: 'done',
                    },
                    onError: {
                      actions: [
                        {
                          params: ({event: {error}}) =>
                            Util.fromUnknownError(error),
                          type: 'assignError',
                        },
                        'abort',
                      ],
                      target: 'errored',
                    },
                    src: 'readSmokerPkgJson',
                  },
                },
              },
            },
          },
          type: Const.PARALLEL,
        },

        spawningComponents: {
          always: 'done',
          description:
            'From components registered via plugins, spawns ReporterMachines (one per Reporter) and PkgManagerMachines (one per PkgManager). ReporterMachines must be spawned before PkgManagerMachines, because the latter can start emitting events immediately, and the former needs to be ready to receive them (via the bus machines).',
          entry: [
            'spawnReporterMachines',
            'initEventBusMachines',
            'spawnPkgManagerMachines',
          ],
          exit: 'clearEnvelopes',
        },

        /**
         * These "event bus" machines are kept separate because this machine was
         * already huge.
         */
        spawningEventBusMachines: {
          always: ['spawningComponents'],
          description:
            'Spawns logically-organized helper machines machines which receive events from this machine, then prepare and emit events to the ReporterMachines',
          entry: 'spawnEventBusMachines',
        },
        validatingPkgManagers: {
          always: ['spawningEventBusMachines'],
          description:
            'Once the pkg managers have been loaded, we need to cross-reference them with the desired package managers--and fail if any are missing',
          entry: 'validatePkgManagers',
        },
      },
    },

    noop: {
      entry: [log('🤷 Nothing to do!'), 'assignSmokeResults'],
      type: Const.FINAL,
    },
    shutdown: {
      description:
        'Graceful shutdown process; sends final events to reporters and tells them to gracefully shut themselves down. At this point, all package manager machines should have shut down gracefully',
      initial: 'reportResults',
      onDone: {
        target: 'stopped',
      },
      states: {
        beforeExit: {
          after: {
            2000: {
              actions: [
                log('Forcing shutdown; reporters did not exit cleanly'),
                'destroyAllReporterMachines',
                {
                  params: () =>
                    // TODO: create a TimeoutError
                    new Error('Reporters failed to exit after 2000ms'),
                  type: 'assignError',
                },
              ],
              target: 'errored',
            },
          },
          always: [
            {
              guard: and(['hasError', not('hasReporterRefs')]),
              target: 'errored',
            },
            {
              guard: and(['hasNoError', not('hasReporterRefs')]),
              target: 'complete',
            },
          ],
          description:
            'Reports the BeforeExit event, then flushes the reporters; waits until all reporters have exited cleanly to proceed',
          entry: [
            {
              params: {type: Events.BeforeExit},
              type: 'report',
            },
            log('flushing reporters...'),
            {
              type: 'flushReporters',
            },
          ],
        },
        complete: {
          entry: [
            log(
              ({context: {startTime}}) =>
                `Complete in ${Util.delta(startTime)}s`,
            ),
          ],
          type: Const.FINAL,
        },
        errored: {
          entry: [
            log(
              ({context: {startTime}}) =>
                `Completed (with error) in ${Util.delta(startTime)}s`,
            ),
          ],
          type: Const.FINAL,
        },
        maybeReportLingered: {
          always: [
            {
              guard: 'hasLingered',
              target: 'reportLingered',
            },
            'beforeExit',
          ],
          description:
            'Determines whether or not to report a lingering temp dir',
        },
        reportLingered: {
          always: 'beforeExit',
          description: 'Reports the Lingered event',
          entry: {
            params: ({
              context: {lingered},
            }): EventData<typeof Events.Lingered> => {
              assert.ok(lingered);
              return {
                directories: lingered,
                type: Events.Lingered,
              };
            },
            type: 'report',
          },
        },
        reportResults: {
          always: {
            actions: [
              'assignSmokeResults',
              {
                params: ({
                  context: {result},
                }): EventData<
                  | typeof Events.SmokeError
                  | typeof Events.SmokeFailed
                  | typeof Events.SmokeOk
                > => {
                  assert.ok(result);
                  return result.type === Const.ERROR
                    ? {
                        ...result,
                        resultType: result.type,
                        type: Events.SmokeError,
                      }
                    : result.type === Const.FAILED
                      ? {
                          ...result,
                          resultType: result.type,
                          type: Events.SmokeFailed,
                        }
                      : {
                          ...result,
                          resultType: result.type,
                          type: Events.SmokeOk,
                        };
                },
                type: 'report',
              },
            ],
            target: 'maybeReportLingered',
          },
        },
      },
    },
    stopped: {
      type: Const.FINAL,
    },
    working: {
      always: {
        // we begin the shutdown process when 1. the shouldShutdown flag is true, and 2. when all pkg managers have shut themselves down.
        guard: and(['shouldShutdown', 'isWorkComplete']),
        target: 'shutdown',
      },
      description:
        'Listens for events emitted by the PkgManagerMachines and forwards them to the bus machines (which ultimately emit events to ReporterMachines, which invoke the proper listener in each enabled Reporter). Operations happen in a pipeline; for each workspace, we pack, install the tarball to a temp dir, then lint and/or run scripts in the install destination. Packing and installation must happen before we can lint or run scripts. All PkgManagerMachines run in parallel, but installation is sequential in each (since some package managers have trouble running in parallel due to shared caches).',
      entry: [
        {
          params: ({
            context: {
              pkgManagers = [],
              smokerOptions,
              staticPlugins,
              workspaceInfo = [],
            },
          }): EventData<typeof Events.SmokeBegin> => {
            return {
              pkgManagers,
              plugins: staticPlugins,
              smokerOptions,
              type: Events.SmokeBegin,
              workspaceInfo: workspaceInfo.map(Util.asResult),
            };
          },
          type: 'report',
        },
      ],
      states: {
        installing: {
          initial: 'listening',
          states: {
            done: {
              type: Const.FINAL,
            },
            errored: {
              entry: 'abort',
              type: Const.FINAL,
            },
            listening: {
              always: {
                guard: 'hasError',
                target: 'errored',
              },

              exit: {
                params: BusActorMap.InstallBusMachine,
                type: 'cleanupBusMachine',
              },

              on: {
                [Events.InstallFailed]: {
                  actions: {
                    params: ({event: {error}}) => error,
                    type: 'assignError',
                  },
                  target: 'errored',
                },
                [Events.InstallOk]: 'done',
                'INSTALL.PKG.*': {
                  actions: [
                    {
                      params: ({event}) => ({
                        event,
                        prop: BusActorMap.InstallBusMachine,
                      }),
                      type: 'forward',
                    },
                  ],
                },
                'INSTALL.PKG_MANAGER.*': {
                  actions: [
                    {
                      params: ({event}) => ({
                        event,
                        prop: BusActorMap.InstallBusMachine,
                      }),
                      type: 'forward',
                    },
                  ],
                },
              },
            },
          },
        },
        linting: {
          initial: 'idle',
          states: {
            errored: {
              type: Const.FINAL,
            },
            failed: {
              type: Const.FINAL,
            },
            idle: {
              always: {
                guard: not('shouldLint'),
                target: 'noop',
              },
              on: {
                [Events.PkgInstallOk]: 'listening',
              },
            },
            listening: {
              always: {
                guard: 'hasError',
                target: 'errored',
              },
              exit: {
                params: BusActorMap.LintBusMachine,
                type: 'cleanupBusMachine',
              },
              on: {
                [Events.LintFailed]: {
                  actions: [
                    {
                      params: ({event: {results}}) => results,
                      type: 'assignLintResults',
                    },
                  ],
                  target: 'failed',
                },
                [Events.LintOk]: {
                  actions: [
                    {
                      params: ({event: {results}}) => results,
                      type: 'assignLintResults',
                    },
                  ],
                  target: 'ok',
                },
                'LINT.PKG_MANAGER.*': {
                  actions: [
                    {
                      params: ({event}) => {
                        return {
                          event,
                          prop: BusActorMap.LintBusMachine,
                        };
                      },
                      type: 'forward',
                    },
                  ],
                },
                'LINT.RULE.*': {
                  actions: [
                    {
                      params: ({event}) => {
                        return {
                          event,
                          prop: BusActorMap.LintBusMachine,
                        };
                      },
                      type: 'forward',
                    },
                  ],
                },
              },
            },
            noop: {
              type: Const.FINAL,
            },
            ok: {
              type: Const.FINAL,
            },
          },
        },
        packing: {
          initial: 'listening',
          states: {
            done: {
              type: Const.FINAL,
            },
            errored: {
              entry: 'abort',
              type: Const.FINAL,
            },
            listening: {
              always: {
                guard: 'hasError',
                target: 'errored',
              },
              description:
                'Tells the PackBusMachine to emit PackBegin and start listening for events coming out of the PkgManagerMachines',
              entry: ['sendPkgManagerBegin'],
              exit: {
                params: BusActorMap.PackBusMachine,
                type: 'cleanupBusMachine',
              },
              on: {
                [Events.PackFailed]: {
                  actions: {
                    params: ({event: {error}}) => error,
                    type: 'assignError',
                  },
                  target: 'errored',
                },
                [Events.PackOk]: 'done',
                'PACK.PKG.*': {
                  actions: [
                    {
                      params: ({event}) => ({
                        event,
                        prop: BusActorMap.PackBusMachine,
                      }),
                      type: 'forward',
                    },
                  ],
                },
                'PACK.PKG_MANAGER.*': {
                  actions: [
                    {
                      params: ({event}) => ({
                        event,
                        prop: BusActorMap.PackBusMachine,
                      }),
                      type: 'forward',
                    },
                  ],
                },
              },
            },
          },
        },
        running: {
          initial: 'idle',
          states: {
            errored: {
              type: Const.FINAL,
            },
            failed: {
              type: Const.FINAL,
            },
            idle: {
              always: {
                guard: not('shouldRunScripts'),
                target: 'noop',
              },
              on: {
                [Events.PkgInstallOk]: 'listening',
              },
            },
            listening: {
              exit: {
                params: BusActorMap.ScriptBusMachine,
                type: 'cleanupBusMachine',
              },
              on: {
                [Events.RunScriptEnd]: {
                  actions: [
                    {
                      params: ({event}) => ({
                        event,
                        prop: BusActorMap.ScriptBusMachine,
                      }),
                      type: 'forward',
                    },
                  ],
                },
                [Events.RunScriptsFailed]: 'failed',
                [Events.RunScriptsOk]: 'ok',
                'SCRIPTS.PKG_MANAGER.*': {
                  actions: [
                    {
                      params: ({event}) => ({
                        event,
                        prop: BusActorMap.ScriptBusMachine,
                      }),
                      type: 'forward',
                    },
                  ],
                },
                'SCRIPTS.SCRIPT.RESULT.*': {
                  actions: [
                    {
                      params: ({event: {result}}) => result,
                      type: 'appendRunScriptResult',
                    },
                    {
                      params: ({event}) => ({
                        event,
                        prop: BusActorMap.ScriptBusMachine,
                      }),
                      type: 'forward',
                    },
                  ],
                },
              },
            },
            noop: {
              type: Const.FINAL,
            },
            ok: {
              type: Const.FINAL,
            },
          },
        },
      },
      type: Const.PARALLEL,
    },
  },
});
