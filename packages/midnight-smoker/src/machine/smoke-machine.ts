import * as Const from '#constants';
import {Events} from '#constants/event';
import * as Err from '#error/meta/for-control-machine';
import {type DataForEvent} from '#event/events';
import {type SmokeOkEventData} from '#event/smoker-events';
import {
  queryWorkspaces,
  type QueryWorkspacesInput,
} from '#machine/actor/query-workspaces';
import {
  readSmokerPkgJson,
  type ReadSmokerPkgJsonInput,
} from '#machine/actor/read-smoker-pkg-json';
import * as Bus from '#machine/bus';
import type * as Event from '#machine/event';
import type * as Payload from '#machine/payload';
import {
  PkgManagerMachine,
  type PkgManagerMachineBeginEvent,
  type PkgManagerMachineOutput,
} from '#machine/pkg-manager-machine';
import {
  LoadableComponents,
  PluginLoaderMachine,
  type PluginLoaderMachineOutput,
} from '#machine/plugin-loader-machine';
import {
  ReporterMachine,
  type ReporterMachineInput,
  type ReporterMachineOutput,
} from '#machine/reporter-machine';
import * as MUtil from '#machine/util';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PluginRegistry} from '#plugin/plugin-registry';
import type * as Schema from '#schema/meta/for-control-machine';
import {type FileManager} from '#util/filemanager';
import * as Util from '#util/meta/for-control-machine';
import {isEmpty} from 'lodash';
import assert from 'node:assert';
import {type PackageJson, type ValueOf} from 'type-fest';
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

type BusActorProp = ValueOf<typeof BusActors>;

/**
 * Output of a {@link SmokeMachine}
 */
export type SmokeMachineOutput = SmokeMachineOutputOk | SmokeMachineOutputError;

/**
 * Output of a {@link SmokeMachine} when an error occurs
 */
export type SmokeMachineOutputError = MUtil.ActorOutputError<
  Error,
  CommonSmokeMachineOutput
>;

/**
 * Output of a {@link SmokeMachine} when no error occurs
 */
export type SmokeMachineOutputOk =
  MUtil.ActorOutputOk<CommonSmokeMachineOutput>;

/**
 * Properties common to any type of {@link SmokeMachineOutput}
 */
interface CommonSmokeMachineOutput extends SmokeOkEventData {
  /**
   * If the machine has aborted, this will be `true`.
   */
  aborted?: boolean;

  /**
   * Actor ID
   */
  id: string;

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
  fileManager: FileManager;

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
   * Mapping of actor ID to {@link PluginLoaderMachine} reference; one per plugin
   */
  loaderMachineRefs: Record<string, ActorRefFrom<typeof PluginLoaderMachine>>;

  /**
   * Reference to a {@link Bus.PackBusMachine PackBusMachine}
   */
  packBusMachineRef?: ActorRefFrom<typeof Bus.PackBusMachine>;

  /**
   * Temporary; package manager initialization payloads from the
   * {@link PluginLoaderMachine}
   */
  pkgManagerInitPayloads: Payload.PkgManagerInitPayload[];

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
  pkgManagerMachinesOutput: PkgManagerMachineOutput[];

  /**
   * For convenience; static package manager specs for each enabled
   * `PkgManagerDef`.
   */
  pkgManagers?: Schema.StaticPkgManagerSpec[];

  /**
   * Temporary; reporter initialization payloads from the
   * {@link PluginLoaderMachine}
   */
  reporterInitPayloads: Payload.ReporterInitPayload[];

  /**
   * Mapping of actor ID to {@link ReporterMachine} reference; one per enabled
   * reporter
   */
  reporterMachineRefs: Record<string, ActorRefFrom<typeof ReporterMachine>>;

  /**
   * Temporary; rule initialization payloads from the {@link PluginLoaderMachine}
   */
  ruleInitPayloads: Payload.RuleInitPayload[];

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

  /**
   * {@link Schema.WorkspaceInfo Information} about workspaces
   */
  workspaceInfo: Schema.WorkspaceInfo[];
}

/**
 * Input for {@link SmokeMachine}
 */
export interface SmokeMachineInput {
  /**
   * Default {@link Schema.Executor}
   */
  defaultExecutor?: Schema.Executor;

  /**
   * Custom {@link FileManager}
   */
  fileManager?: FileManager;

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
  systemExecutor?: Schema.Executor;
}

/**
 * Mapping of actor ID to actor reference prop in {@link SmokeMachineContext}.
 *
 * Used for various actions performing common tasks on bus machines.
 */
const BusActors = Util.constant({
  PackBusMachine: 'packBusMachineRef',
  InstallBusMachine: 'installBusMachineRef',
  LintBusMachine: 'lintBusMachineRef',
  ScriptBusMachine: 'scriptBusMachineRef',
});

/**
 * Main state machine for the `midnight-smoker` application.
 *
 * Prior to this, plugins should already have been registered with the
 * {@link PluginRegistry}.
 */
export const SmokeMachine = setup({
  types: {
    context: {} as SmokeMachineContext,
    emitted: {} as Event.SmokeMachineEventEmitted,
    events: {} as Event.SmokeMachineEvent,
    input: {} as SmokeMachineInput,
    output: {} as SmokeMachineOutput,
  },
  actors: {
    ScriptBusMachine: Bus.ScriptBusMachine,
    PackBusMachine: Bus.PackBusMachine,
    InstallBusMachine: Bus.InstallBusMachine,
    LintBusMachine: Bus.LintBusMachine,
    readSmokerPkgJson,
    queryWorkspaces,
    ReporterMachine,
    PkgManagerMachine,
    PluginLoaderMachine,
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
    ) => !allowPrivate && workspaceInfo.every(({pkgJson}) => pkgJson.private),

    /**
     * Returns true if the `aborted` flag has been set.
     */
    isAborted: ({context: {aborted}}) => Boolean(aborted),

    /**
     * Returns `true` if the machine doesn't have anything to do.
     */

    isNoop: and([not('shouldLint'), not('shouldRunScripts')]),

    /**
     * Returns `true` if linting or script execution failed
     */
    didFail: ({
      context: {lintResults = [], runScriptResults = [], pkgManagers},
    }) =>
      (Boolean(pkgManagers) &&
        lintResults.some(({type}) => type === Const.FAILED)) ||
      runScriptResults.some(({type}) => type === Const.FAILED),

    /**
     * Returns `true` if the `lingered` context prop is a nonempty array.
     */
    hasLingered: ({context: {lingered}}) => !isEmpty(lingered),

    /**
     * If `true`, then the `LINT` event was received.
     */
    shouldLint: ({
      context: {
        smokerOptions: {lint},
      },
    }) => lint,

    /**
     * If `true`, then either the `SHUTDOWN` event was received or it was set in
     * {@link SmokeMachineInput}.
     */
    shouldShutdown: ({context: {shouldShutdown}}) => shouldShutdown,

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
      ({context: {pkgManagers = [], pkgManagerMachinesOutput}}) =>
        !isEmpty(pkgManagerMachinesOutput) &&
        pkgManagers.length === pkgManagerMachinesOutput.length &&
        pkgManagerMachinesOutput.every(({aborted}) => !aborted),
    ]),

    /**
     * If `true`, then one or more custom scripts have been executed.
     */
    hasScriptResults: ({context: {runScriptResults}}) =>
      !isEmpty(runScriptResults),

    /**
     * If `true`, then the `RUN_SCRIPTS` event was received
     */
    shouldRunScripts: ({
      context: {
        smokerOptions: {script: scripts},
      },
    }) => !isEmpty(scripts),

    /**
     * Returns `true` if a machine's output is {@link MUtil.ActorOutputOk "ok"}.
     */
    isMachineOutputOk: (_, output: MUtil.ActorOutput) =>
      MUtil.isActorOutputOk(output),

    /**
     * Returns `true` if a machine's output is
     * {@link MUtil.ActorOutputError "not ok"}.
     */
    isMachineOutputNotOk: (_, output: MUtil.ActorOutput): boolean =>
      MUtil.isActorOutputNotOk(output),

    /**
     * Returns `true` if {@link SmokeMachineContext.error} is truthy.
     */
    hasError: ({context: {error}}) => Boolean(error),

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
     * Returns `true` if {@link SmokeMachineContext.loaderMachineRefs} has at
     * least one value
     */
    hasLoaderRefs: ({context: {loaderMachineRefs}}) =>
      !isEmpty(loaderMachineRefs),
  },
  actions: {
    /**
     * Sends the `BEGIN` event to all `PkgManagerMachine`s, which should kickoff
     * packing.
     */
    sendPkgManagerBegin: enqueueActions(
      ({enqueue, context: {pkgManagerMachineRefs = {}}}) => {
        const evt: PkgManagerMachineBeginEvent = {type: 'BEGIN'};
        Object.values(pkgManagerMachineRefs).forEach((ref) => {
          enqueue.sendTo(ref, evt);
        });
      },
    ),

    /**
     * Raises an {@link Event.AbortEvent AbortEvent}.
     */
    abort: raise({type: 'ABORT'}),

    /**
     * Sets {@link SmokeMachineContext.aborted} to `true`.
     */
    aborted: assign({aborted: true}),

    /**
     * Appends a {@link PkgManagerMachineOutput} to
     * {@link SmokeMachineContext.pkgManagerMachinesOutput pkgManagerMachinesOutput}
     * (which is for tracking which {@link PkgManagerMachine PkgManagerMachines}
     * have completed)
     */
    appendPkgManagerMachineOutput: assign({
      pkgManagerMachinesOutput: (
        {context: {pkgManagerMachinesOutput}},
        output: PkgManagerMachineOutput,
      ) => [...pkgManagerMachinesOutput, output],
    }),

    /**
     * Assigns workspace info after {@link queryWorkspaces} has completed.
     *
     * {@link SmokeMachineContext.uniquePkgsNames} is also cached here to safe a
     * few trips through the array.
     */
    assignWorkspaceInfo: assign({
      workspaceInfo: (_, workspaceInfo: Schema.WorkspaceInfo[]) =>
        workspaceInfo,
    }),

    /**
     * Generic action to send a {@link Event.ListenEvent} to a bus machine
     */
    listen: sendTo(
      ({context}, prop: BusActorProp) => {
        const ref = context[prop];
        assert.ok(ref);
        return ref;
      },
      ({context: {reporterMachineRefs}}): Bus.ListenEvent => ({
        type: 'LISTEN',
        actorIds: Object.keys(reporterMachineRefs),
      }),
    ),

    /**
     * Overwrites `smokerPkgJson` with the contents of our `package.json` file;
     * will be provided to {@link ReporterMachine}s upon spawn
     */
    assignSmokerPkgJson: assign({
      smokerPkgJson: (_, smokerPkgJson: PackageJson) => smokerPkgJson,
    }),

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
     * Overwrite lint results
     */
    assignLintResults: assign({
      lintResults: (_, lintResults: Schema.LintResult[]) => lintResults,
    }),

    /**
     * Overwrite script results
     */
    assignRunScriptResults: assign({
      runScriptResults: (_, runScriptResults: Schema.RunScriptResult[]) =>
        runScriptResults,
    }),

    /**
     * Spawns a {@link PluginLoaderMachine} for each plugin
     */
    spawnLoaders: assign({
      loaderMachineRefs: ({
        context: {pluginRegistry, smokerOptions, workspaceInfo},
        spawn,
      }) =>
        Object.fromEntries(
          pluginRegistry.plugins.map((plugin) => {
            const id = `PluginLoaderMachine.[${plugin.id}]`;
            const actor = spawn('PluginLoaderMachine', {
              id,
              input: {
                plugin,
                pluginRegistry,
                workspaceInfo,
                smokerOptions,
                component: LoadableComponents.All,
              },
            });

            return [id, MUtil.monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),

    /**
     * Stops a given {@link PluginLoaderMachine}
     *
     * Generally executed _after_ the `PluginLoaderMachine` is done
     */
    cleanupLoaderMachine: enqueueActions(
      ({enqueue, context: {loaderMachineRefs}}, id: string) => {
        enqueue.stopChild(id);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = loaderMachineRefs;
        enqueue.assign({
          loaderMachineRefs: rest,
        });
      },
    ),

    /**
     * Immediately after emitting `BeforeExit`, this tells the
     * `ReporterMachine`s to drain their event queues and begin its shutdown
     * procedure
     */
    flushReporters: enqueueActions(
      ({self, enqueue, context: {reporterMachineRefs}}) => {
        Object.values(reporterMachineRefs).forEach((reporterMachine) => {
          enqueue.sendTo(reporterMachine, {type: 'HALT'});
          self.system._logger(`Sent HALT to ${reporterMachine.id}`);
        });
      },
    ),

    /**
     * Creates or updates an aggregate {@link SmokerError}.
     *
     * If an aggregate {@link Err.MachineError} is passed, the errors within it
     * will be dereferenced.
     */
    assignError: assign({
      error: ({self, context}, error: Error | Error[]) => {
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
     * Stops a single reporter machine.
     *
     * The machine is already likely stopped, but this makes it explicit and
     * clears the reference.
     */
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

    /**
     * Sends an event directly to all of the reporter machines (not via a bus
     * machine)
     *
     * Also emits the same event.
     */
    report: enqueueActions(
      (
        {self, enqueue, context: {reporterMachineRefs}},
        event: Event.SmokeMachineEventEmitted,
      ) => {
        enqueue.emit(event);
        for (const reporterMachineRef of Object.values(reporterMachineRefs)) {
          enqueue.sendTo(reporterMachineRef, {type: 'EVENT', event});
        }
        self.system._logger(`📨 Emitted ${event.type}`);
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
     * Spawns machines for each enabled `ReporterDef` and `PkgManagerDef` added
     * by plugins.
     *
     * At this point, the following should be true:
     *
     * 1. `midnight-smoker`'s `package.json` will have been read and assigned to
     *    {@link SmokeMachineContext.smokerPkgJson smokerPkgJson}
     * 2. The `PluginLoaderMachine` will have completed successfully and output the
     *    "init payload" objects, assigned to
     *    {@link SmokeMachineContext.pkgManagerInitPayloads pkgManagerInitPayloads}
     *    and
     *    {@link SmokeMachineContext.reporterInitPayloads reporterInitPayloads}
     * 3. Workspaces will have been queried and assigned to
     *    {@link SmokeMachineContext.workspaceInfo workspaceInfo}
     */
    spawnComponentMachines: assign({
      reporterMachineRefs: ({
        spawn,
        context: {
          reporterMachineRefs,
          smokerOptions,
          reporterInitPayloads,
          smokerPkgJson,
        },
      }) => {
        assert.ok(smokerPkgJson);
        const newRefs = Object.fromEntries(
          reporterInitPayloads.map(({def, plugin}) => {
            const id = `ReporterMachine.[${plugin.id}/${def.name}]`;
            const input: ReporterMachineInput = {
              def,
              smokerOptions,
              plugin,
              smokerPkgJson,
            };
            const actor = spawn('ReporterMachine', {
              id,
              systemId: id,
              input,
            });
            return [id, MUtil.monkeypatchActorLogger(actor, id)];
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
          smokerOptions: {
            all,
            workspace,
            rules,
            script: scripts,
            linger,
            add: additionalDeps,
            lint: shouldLint,
          },
          pkgManagerInitPayloads,
          ruleInitPayloads,
          shouldShutdown,
        },
      }) => {
        const useWorkspaces = all || !isEmpty(workspace);

        const newRefs = Object.fromEntries(
          pkgManagerInitPayloads.map(({def, spec, plugin}) => {
            const executor = spec.isSystem ? systemExecutor : defaultExecutor;
            const id = `PkgManagerMachine.[${plugin.id}/${def.name}]<${spec}>`;
            const actorRef = spawn('PkgManagerMachine', {
              id,
              input: {
                spec,
                def,
                workspaceInfo,
                executor,
                plugin: Util.serialize(plugin),
                fileManager,
                parentRef: self,
                linger,
                useWorkspaces,
                additionalDeps: [...new Set(additionalDeps)],
                scripts,
                ruleConfigs: rules,
                ruleInitPayloads,
                shouldLint,
                shouldShutdown,
              },
            });
            return [id, MUtil.monkeypatchActorLogger(actorRef, id)];
          }),
        );
        return {...pkgManagerMachineRefs, ...newRefs};
      },
    }),

    /**
     * Stops a {@link PkgManagerMachine}.
     *
     * The machine is already likely stopped, but this makes it explicit and
     * clears the reference.
     */
    cleanupPkgManagerMachine: enqueueActions(
      ({enqueue, context: {pkgManagerMachineRefs}}, id: string): void => {
        enqueue.stopChild(id);

        assert.ok(pkgManagerMachineRefs);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = pkgManagerMachineRefs;
        enqueue.assign({
          pkgManagerMachineRefs: rest,
        });
      },
    ),

    /**
     * When a {@link PluginLoaderMachine} is finished, this processes its output.
     */
    pluginLoaderMachineDoneHandler: enqueueActions(
      (
        {
          enqueue,
          context: {
            pkgManagers = [],
            reporterInitPayloads = [],
            pkgManagerInitPayloads = [],
            ruleInitPayloads = [],
          },
        },
        output: PluginLoaderMachineOutput,
      ): void => {
        const {id} = output;
        if (MUtil.isActorOutputOk(output)) {
          const {
            reporterInitPayloads: newReporterInitPayloads,
            ruleInitPayloads: newRuleInitPayloads,
            pkgManagerInitPayloads: newPkgManagerInitPayloads,
          } = output;
          const newPkgManagers = newPkgManagerInitPayloads.map(({spec}) =>
            Util.serialize(spec),
          );
          enqueue.assign({
            reporterInitPayloads: [
              ...reporterInitPayloads,
              ...newReporterInitPayloads,
            ],
            ruleInitPayloads: [...ruleInitPayloads, ...newRuleInitPayloads],
            pkgManagerInitPayloads: [
              ...pkgManagerInitPayloads,
              ...newPkgManagerInitPayloads,
            ],
            pkgManagers: [...pkgManagers, ...newPkgManagers],
          });
        } else {
          // @ts-expect-error - TS sux
          enqueue({type: 'assignError', params: output.error});
          // @ts-expect-error - TS sux
          enqueue({type: 'abort'});
        }
        // @ts-expect-error - TS sux
        enqueue({type: 'cleanupLoaderMachine', params: id});
      },
    ),

    /**
     * After the init payloads have been used to spawn
     * {@link ReporterMachine ReporterMachines} and
     * {@link PkgManagerMachine PkgManagerMachines}, we can safely drop the data
     * from the context.
     */
    clearInitPayloads: assign({
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
    }),

    /**
     * Generic action to free an event bus machine reference (and stop the
     * machine)
     */
    cleanupBusMachine: enqueueActions(
      ({enqueue, context}, prop: BusActorProp) => {
        const ref = context[prop];
        if (ref) {
          enqueue.stopChild(ref);
        }
        enqueue.assign({[prop]: undefined});
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
        {enqueue, context},
        {
          prop,
          event,
        }: {
          prop: BusActorProp;
          event:
            | Bus.PackBusMachineEvents
            | Bus.InstallBusMachineEvents
            | Bus.LintBusMachineEvents
            | Bus.ScriptBusMachineEvent;
        },
      ) => {
        const ref = context[prop];
        assert.ok(ref);
        enqueue.sendTo(ref, event);
      },
    ),

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
      smokerOptions: ({
        context: {
          smokerOptions: {add, ...smokerOptions},
          workspaceInfo,
        },
      }) => {
        const normalizedAdds = Util.normalizeInstallables(add, workspaceInfo);
        return {...smokerOptions, add: normalizedAdds};
      },
    }),

    /**
     * Stops most children, including:
     *
     * - `PkgManagerMachine`
     * - `PluginLoaderMachine`
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
    }),

    /**
     * Stops all `ReporterMachines`s.
     *
     * This action is taken as a last resort if the `ReporterMachine`s do not
     * shutdown gracefully before a timeout is exceeded.
     */
    destroyAllReporterMachines: enqueueActions(
      ({enqueue, context: {reporterMachineRefs}}) => {
        for (const child of Object.values(reporterMachineRefs)) {
          enqueue.stopChild(child);
        }
        enqueue.assign({
          reporterMachineRefs: Object.create(
            null,
          ) as SmokeMachineContext['reporterMachineRefs'],
        });
      },
    ),

    spawnEventBusMachines: assign({
      packBusMachineRef: ({
        spawn,
        context: {workspaceInfo, smokerOptions, pkgManagers},
        self: parentRef,
      }) => {
        assert.ok(pkgManagers);
        const input: Bus.PackBusMachineInput = {
          workspaceInfo,
          smokerOptions,
          pkgManagers,
          parentRef,
        };
        const actor = spawn('PackBusMachine', {
          id: 'PackBusMachine',
          input,
          systemId: 'PackBusMachine',
        });
        return MUtil.monkeypatchActorLogger(actor, 'PackBusMachine');
      },
      installBusMachineRef: ({
        spawn,
        context: {workspaceInfo, smokerOptions, pkgManagers},
        self: parentRef,
      }) => {
        assert.ok(pkgManagers);
        const input: Bus.InstallBusMachineInput = {
          workspaceInfo,
          smokerOptions,
          pkgManagers,
          parentRef,
        };
        const actor = spawn('InstallBusMachine', {
          id: 'InstallBusMachine',
          input,
          systemId: 'InstallBusMachine',
        });
        return MUtil.monkeypatchActorLogger(actor, 'InstallBusMachine');
      },
      lintBusMachineRef: ({
        spawn,
        context: {workspaceInfo, smokerOptions, pkgManagers, ruleInitPayloads},
        self: parentRef,
      }) => {
        // refuse to spawn if we shouldn't be linting anyway
        if (!smokerOptions.lint) {
          return undefined;
        }
        assert.ok(pkgManagers);
        const input: Bus.LintBusMachineInput = {
          workspaceInfo,
          smokerOptions,
          pkgManagers,
          parentRef,
          ruleDefs: ruleInitPayloads.map(({def}) => def),
        };
        const actor = spawn('LintBusMachine', {
          id: 'LintBusMachine',
          input,
          systemId: 'LintBusMachine',
        });
        return MUtil.monkeypatchActorLogger(actor, 'LintBusMachine');
      },
      scriptBusMachineRef: ({
        spawn,
        context: {smokerOptions, pkgManagers, workspaceInfo},
        self: parentRef,
      }) => {
        // refuse to spawn anything if there are no scripts requested
        if (isEmpty(smokerOptions.script)) {
          return undefined;
        }
        assert.ok(pkgManagers);
        const input: Bus.ScriptBusMachineInput = {
          smokerOptions,
          pkgManagers,
          parentRef,
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

    /**
     * Compares package managers received by the `PluginLoaderMachine`s against
     * those that were requested by the user, and aborts if any are unsupported
     * (missing).
     */
    validatePkgManagers: enqueueActions(
      ({
        enqueue,
        context: {
          smokerOptions: {pkgManager: desiredPkgManagers = []},
          pkgManagerInitPayloads,
        },
      }) => {
        const unsupportedPkgManagers = PkgManagerSpec.filterUnsupported(
          pkgManagerInitPayloads.map(({spec}) => spec),
          desiredPkgManagers,
        );

        for (const unsupported of unsupportedPkgManagers) {
          enqueue({
            // @ts-expect-error - TS sux
            type: 'assignError',
            params: new Err.UnsupportedPackageManagerError(
              `No package manager implementation found that can handle "${unsupported}"`,
              unsupported,
            ),
          });
        }
        if (!isEmpty(unsupportedPkgManagers)) {
          // @ts-expect-error - TS sux
          enqueue('abort');
        }
      },
    ),
  },
}).createMachine({
  id: 'SmokeMachine',
  context: ({
    input: {
      fileManager,
      defaultExecutor,
      systemExecutor,
      smokerOptions,
      shouldShutdown = false,
      ...rest
    },
  }): SmokeMachineContext => {
    defaultExecutor ??= rest.pluginRegistry.getExecutor(
      Const.DEFAULT_EXECUTOR_ID,
    );
    systemExecutor ??= rest.pluginRegistry.getExecutor(
      Const.SYSTEM_EXECUTOR_ID,
    );
    fileManager ??= Util.FileManager.create();
    const staticPlugins: SmokeMachineContext['staticPlugins'] = Util.serialize(
      rest.pluginRegistry.plugins,
    );
    const startTime: SmokeMachineContext['startTime'] = performance.now();
    const loaderMachineRefs = Object.create(
      null,
    ) as SmokeMachineContext['loaderMachineRefs'];
    const reporterMachineRefs = Object.create(
      null,
    ) as SmokeMachineContext['reporterMachineRefs'];

    return {
      ...rest,
      defaultExecutor,
      systemExecutor,
      fileManager,
      smokerOptions,
      shouldShutdown,
      staticPlugins,
      startTime,
      loaderMachineRefs,
      reporterMachineRefs,
      workspaceInfo: [],
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
      pkgManagerMachinesOutput: [],
    };
  },
  initial: 'init',
  entry: [log('Starting')],
  exit: [log('Stopped')],
  on: {
    ABORT: {
      guard: not('isAborted'),
      description:
        'Immediately stops all children then begins shutdown procedure',
      actions: [
        {
          type: 'report',
          params: ({event: {reason}}): DataForEvent<typeof Events.Aborted> => {
            return {
              type: Events.Aborted,
              reason,
            };
          },
        },
        log(({event}) => {
          let msg = '🚨 ABORTING!';
          if (event.reason) {
            msg += ` Reason: ${event.reason}`;
          }
          return msg;
        }),
        'destroyMostChildren',
        'aborted',
      ],
      target: '.shutdown',
    },
    SHUTDOWN: {
      description:
        'Tells the machine to shutdown after finishing its work. Does NOT abort nor halt immediately',
      actions: 'shouldShutdown',
    },

    'xstate.done.actor.ReporterMachine.*': [
      {
        description:
          'Handles the case when a ReporterMachine exits with an error',
        guard: {
          type: 'isMachineOutputNotOk',
          params: ({event: {output}}) => output,
        },
        actions: [
          {
            type: 'assignError',
            params: ({event: {output}}) => {
              MUtil.assertActorOutputNotOk(output);
              return output.error;
            },
          },
          {type: 'stopReporterMachine', params: ({event}) => event},
          'abort',
        ],
      },
      {
        description:
          'Frees the ReporterMachine reference when a ReporterMachine exits cleanly',
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
            }) => `${id} exited cleanly`,
          ),
          {type: 'stopReporterMachine', params: ({event}) => event},
        ],
      },
    ],

    // TODO: create action pkgManagerMachineDoneHandler
    'xstate.done.actor.PkgManagerMachine.*': [
      {
        description:
          'Handles the case when a PkgManagerMachine exits w/o error',
        guard: {
          type: 'isMachineOutputOk',
          params: ({event: {output}}) => output,
        },
        actions: [
          {
            type: 'appendPkgManagerMachineOutput',
            params: ({event: {output}}) => output,
          },
          {
            type: 'cleanupPkgManagerMachine',
            params: ({event: {output}}) => output.id,
          },
          log(
            ({
              event: {
                output: {id},
              },
            }) => `${id} exited cleanly`,
          ),
        ],
      },
      {
        description: 'Handles the case when a PkgManagerMachine exits w/ error',
        guard: {
          type: 'isMachineOutputNotOk',
          params: ({event: {output}}) => output,
        },
        actions: [
          {
            type: 'assignError',
            params: ({event: {output}}) => {
              MUtil.assertActorOutputNotOk(output);
              return output.error;
            },
          },
          {
            type: 'cleanupPkgManagerMachine',
            params: ({event: {output}}) => output.id,
          },
          'abort',
        ],
      },
    ],

    /**
     * @todo Move this to a child state, if possible
     */
    LINGERED: {
      description:
        'Only occurs if the `linger` flag was true. During its shutdown process, a PkgManagerMachine will emit this event with its tmpdir path',
      actions: [
        {
          type: 'appendLingered',
          params: ({event: {directory}}) => directory,
        },
      ],
    },
  },
  states: {
    init: {
      always: {
        guard: 'isNoop',
        target: 'noop',
      },
      entry: [log('Initializing environment and components')],
      initial: 'initComponents',
      states: {
        initComponents: {
          description:
            'Gathers information about the environment and spawns a PluginLoaderMachine for each plugin, which provides the enabled components that the plugin adds',
          type: Const.PARALLEL,
          states: {
            queryingWorkspaces: {
              description:
                'Gathers information about workspaces in cwd. If this is not a monorepo, we will only have a single workspace. The root workspace is ignored if we are working in a monorepo.',
              initial: 'queryWorkspaces',
              states: {
                queryWorkspaces: {
                  description:
                    'Invokes the queryWorkspaces actor and assigns the results to the context',
                  invoke: {
                    src: 'queryWorkspaces',
                    id: 'queryWorkspaces',
                    input: ({
                      context: {
                        smokerOptions: {cwd, all, workspace},
                        fileManager,
                      },
                    }): QueryWorkspacesInput => ({
                      all,
                      workspace,
                      fileManager,
                      cwd,
                    }),
                    onDone: [
                      {
                        guard: {
                          type: 'allPrivateWorkspaces',
                          params: ({event: {output}}) => output,
                        },
                        actions: [
                          log(
                            ({
                              context: {
                                smokerOptions: {cwd},
                              },
                            }) =>
                              `all workspaces found from ${cwd} are private!`,
                          ),
                          {
                            type: 'assignError',
                            params: ({
                              context: {
                                smokerOptions: {cwd},
                              },
                              event: {output},
                            }) =>
                              new Err.PrivateWorkspaceError(
                                `All workspaces found from ${cwd} are private`,
                                cwd,
                                output,
                              ),
                          },
                          'abort',
                        ],
                      },
                      {
                        actions: [
                          {
                            type: 'assignWorkspaceInfo',
                            params: ({event: {output}}) => output,
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
                          type: 'assignError',
                          // TODO: need a new SmokerError for this
                          params: ({event: {error}}) =>
                            Util.fromUnknownError(error),
                        },
                      ],
                      target: 'errored',
                    },
                  },
                },
                done: {
                  type: Const.FINAL,
                },
                errored: {
                  entry: ['abort'],
                  type: Const.FINAL,
                },
              },
            },
            readSmokerPkgJson: {
              initial: 'reading',
              states: {
                reading: {
                  description:
                    'Reads our own package.json file (for use by reporters)',
                  invoke: {
                    src: 'readSmokerPkgJson',
                    input: ({
                      context: {fileManager},
                    }): ReadSmokerPkgJsonInput => ({fileManager}),
                    onDone: {
                      actions: [
                        {
                          type: 'assignSmokerPkgJson',
                          params: ({event: {output}}) => output,
                        },
                      ],
                      target: 'done',
                    },
                    onError: {
                      actions: [
                        {
                          type: 'assignError',
                          params: ({event: {error}}) =>
                            Util.fromUnknownError(error),
                        },
                      ],
                      target: 'errored',
                    },
                  },
                },
                done: {
                  type: Const.FINAL,
                },
                errored: {
                  entry: 'abort',
                  type: Const.FINAL,
                },
              },
            },
            loadingPlugins: {
              description:
                'Gathers component objects from each plugin; completed when all spawned PluginLoaderMachines have exited gracefully',
              entry: log('Spawning PluginLoaderMachine'),
              initial: 'loading',
              states: {
                loading: {
                  description:
                    'Spawns PluginLoaderMachines; one per plugin. These will ultimately provide the PkgManagerDef, ReporterDef and RuleDef objects',
                  entry: 'spawnLoaders',
                  on: {
                    'xstate.done.actor.PluginLoaderMachine.*': {
                      actions: {
                        type: 'pluginLoaderMachineDoneHandler',
                        params: ({event: {output}}) => output,
                      },
                    },
                  },
                  always: {
                    guard: not('hasLoaderRefs'),
                    target: 'done',
                  },
                },
                done: {
                  description:
                    'At this point, all PluginLoaderMachines should be done',
                  type: Const.FINAL,
                },
              },
            },
          },
          onDone: [
            {
              guard: 'hasError',
              actions: log('Refusing to validate package managers!'),
            },
            {
              target: 'validatingPkgManagers',
            },
          ],
        },

        validatingPkgManagers: {
          description:
            'Once the pkg managers have been loaded, we need to cross-reference them with the desired package managers--and fail if any are missing',
          entry: 'validatePkgManagers',
          always: [
            {
              guard: 'hasError',
              actions: log('Refusing to spawn event bus machines!'),
            },
            'spawningEventBusMachines',
          ],
        },

        /**
         * These "event bus" machines are kept separate because this machine was
         * already huge.
         */
        spawningEventBusMachines: {
          description:
            'Spawns logically-organized helper machines machines which receive events from this machine, then prepare and emit events to the ReporterMachines',
          entry: 'spawnEventBusMachines',
          always: [
            {
              guard: 'hasError',
              actions: [log('Refusing to spawn components!')],
            },
            'spawningComponents',
          ],
        },

        spawningComponents: {
          description:
            'From components registered via plugins, Spawns PkgManagerMachines (one per PkgManagerDef) and ReporterMachines (one per ReporterDef)',
          entry: 'spawnComponentMachines',
          exit: 'clearInitPayloads',
          always: 'done',
        },
        done: {
          type: Const.FINAL,
        },
      },
      onDone: [
        {
          guard: 'hasError',
          actions: log('Refusing to pack!'),
        },
        {target: 'working'},
      ],
    },

    working: {
      description:
        'Listens for events emitted by the PkgManagerMachines and forwards them to the bus machines (which ultimately emit events to ReporterMachines, which invoke the proper listener in each enabled ReporterDef). Operations happen in a pipeline; for each workspace, we pack, install the tarball to a temp dir, then lint and/or run scripts in the install destination. Packing and installation must happen before we can lint or run scripts. All PkgManagerMachines run in parallel, but installation is sequential in each (since some package managers have trouble running in parallel due to shared caches).',
      entry: [
        {
          type: 'report',
          params: ({
            context: {staticPlugins, smokerOptions, workspaceInfo, pkgManagers},
          }): DataForEvent<typeof Events.SmokeBegin> => {
            assert.ok(pkgManagers);
            return {
              type: Events.SmokeBegin,
              plugins: staticPlugins,
              opts: smokerOptions,
              workspaceInfo: workspaceInfo.map(Util.asResult),
              pkgManagers,
            };
          },
        },
      ],
      type: Const.PARALLEL,
      states: {
        packing: {
          initial: 'listening',
          states: {
            listening: {
              description:
                'Tells the PackBusMachine to emit PackBegin and start listening for events coming out of the PkgManagerMachines',
              entry: [
                {
                  type: 'listen',
                  params: BusActors.PackBusMachine,
                },
                'sendPkgManagerBegin',
              ],
              always: {
                guard: 'hasError',
                target: 'errored',
              },
              exit: {
                type: 'cleanupBusMachine',
                params: BusActors.PackBusMachine,
              },
              on: {
                'PACK.*': {
                  actions: [
                    {
                      type: 'forward',
                      params: ({event}) => ({
                        prop: BusActors.PackBusMachine,
                        event,
                      }),
                    },
                  ],
                },
                [Events.PackOk]: 'done',
                [Events.PackFailed]: {
                  target: 'errored',
                },
              },
            },
            done: {
              type: Const.FINAL,
            },
            errored: {
              entry: 'abort',
              type: Const.FINAL,
            },
          },
        },
        installing: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                'PACK.PKG_PACK_OK': 'listening',
              },
            },
            listening: {
              entry: {
                type: 'listen',
                params: BusActors.InstallBusMachine,
              },

              always: {
                guard: 'hasError',
                target: 'errored',
              },

              exit: {
                type: 'cleanupBusMachine',
                params: BusActors.InstallBusMachine,
              },

              on: {
                'INSTALL.*': {
                  actions: [
                    {
                      type: 'forward',
                      params: ({event}) => ({
                        prop: BusActors.InstallBusMachine,
                        event,
                      }),
                    },
                  ],
                },
                [Events.InstallOk]: 'done',
                [Events.InstallFailed]: 'errored',
              },
            },
            errored: {
              entry: 'abort',
              type: Const.FINAL,
            },
            done: {
              type: Const.FINAL,
            },
          },
        },

        linting: {
          initial: 'idle',
          states: {
            idle: {
              always: {
                guard: not('shouldLint'),
                target: 'noop',
              },
              on: {
                'INSTALL.PKG_INSTALL_OK': {
                  actions: [
                    {
                      type: 'listen',
                      params: BusActors.LintBusMachine,
                    },
                  ],
                  target: 'listening',
                },
              },
            },
            listening: {
              always: {
                guard: 'hasError',
                target: 'errored',
              },
              exit: {
                type: 'cleanupBusMachine',
                params: BusActors.LintBusMachine,
              },
              on: {
                'LINT.*': {
                  actions: [
                    {
                      type: 'forward',
                      params: ({event}) => {
                        return {
                          prop: BusActors.LintBusMachine,
                          event,
                        };
                      },
                    },
                  ],
                },
                [Events.LintOk]: {
                  actions: [
                    {
                      type: 'assignLintResults',
                      params: ({event: {results}}) => results,
                    },
                  ],
                  target: 'ok',
                },
                [Events.LintFailed]: {
                  actions: [
                    {
                      type: 'assignLintResults',
                      params: ({event: {results}}) => results,
                    },
                  ],
                  target: 'failed',
                },
              },
            },
            errored: {
              type: Const.FINAL,
            },
            ok: {
              type: Const.FINAL,
            },
            failed: {
              type: Const.FINAL,
            },
            noop: {
              type: Const.FINAL,
            },
          },
        },
        running: {
          initial: 'idle',
          states: {
            idle: {
              always: {
                guard: not('shouldRunScripts'),
                target: 'noop',
              },
              on: {
                'INSTALL.PKG_INSTALL_OK': 'listening',
              },
            },
            listening: {
              entry: {
                type: 'listen',
                params: BusActors.ScriptBusMachine,
              },
              exit: {
                type: 'cleanupBusMachine',
                params: BusActors.ScriptBusMachine,
              },
              on: {
                'SCRIPT.*': {
                  actions: [
                    {
                      type: 'forward',
                      params: ({event}) => ({
                        prop: BusActors.ScriptBusMachine,
                        event,
                      }),
                    },
                  ],
                },
                [Events.RunScriptsOk]: {
                  actions: [
                    {
                      type: 'assignRunScriptResults',
                      params: ({event}) => event.results,
                    },
                  ],
                  target: 'ok',
                },
                [Events.RunScriptsFailed]: 'failed',
              },
            },
            failed: {
              type: Const.FINAL,
            },
            ok: {
              type: Const.FINAL,
            },
            errored: {
              type: Const.FINAL,
            },
            noop: {
              type: Const.FINAL,
            },
          },
        },
      },
      always: {
        // we begin the shutdown process when 1. the shouldShutdown flag is true, and 2. when all pkg managers have shut themselves down.
        guard: and(['shouldShutdown', 'isWorkComplete']),
        target: 'shutdown',
      },
    },
    shutdown: {
      description:
        'Graceful shutdown process; sends final events to reporters and tells them to gracefully shut themselves down. At this point, all package manager machines should have shut down gracefully',
      initial: 'reportResults',
      states: {
        reportResults: {
          always: [
            {
              guard: 'hasError',
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      smokerOptions,
                      runScriptResults = [],
                      lintResults = [],
                      error,
                      workspaceInfo,
                      pkgManagers = [],
                      staticPlugins,
                    },
                  }): DataForEvent<typeof Events.SmokeError> => {
                    assert.ok(error);
                    const smokeError = new Err.SmokeError(error.errors, {
                      lint: lintResults,
                      script: runScriptResults,
                    });
                    return {
                      type: Events.SmokeError,
                      lint: lintResults,
                      scripts: runScriptResults,
                      error: smokeError,
                      plugins: staticPlugins,
                      pkgManagers,
                      workspaceInfo: workspaceInfo.map(Util.asResult),
                      opts: smokerOptions,
                    };
                  },
                },
              ],
              target: 'maybeReportLingered',
            },
            {
              guard: 'didFail',
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      smokerOptions,
                      runScriptResults = [],
                      lintResults = [],
                      pkgManagers,
                      staticPlugins,
                      workspaceInfo,
                    },
                  }): DataForEvent<typeof Events.SmokeFailed> => {
                    const scriptFailed = runScriptResults.filter(
                      ({type}) => type === Const.FAILED,
                    ) as Schema.RunScriptResultFailed[];
                    const lintFailed = lintResults.filter(
                      ({type}) => type === Const.FAILED,
                    ) as Schema.LintResultFailed[];
                    assert.ok(pkgManagers);
                    return {
                      type: Events.SmokeFailed,
                      lint: lintResults,
                      scripts: runScriptResults,
                      scriptFailed,
                      lintFailed,
                      plugins: staticPlugins,
                      workspaceInfo: workspaceInfo.map(Util.asResult),
                      pkgManagers,
                      opts: smokerOptions,
                    };
                  },
                },
              ],
              target: 'maybeReportLingered',
            },
            {
              guard: not('didFail'),
              actions: [
                {
                  type: 'report',
                  params: ({
                    context: {
                      smokerOptions,
                      runScriptResults,
                      lintResults,
                      staticPlugins,
                      workspaceInfo,
                      pkgManagers = [],
                    },
                  }): DataForEvent<typeof Events.SmokeOk> => ({
                    type: Events.SmokeOk,
                    lint: lintResults,
                    scripts: runScriptResults,
                    plugins: staticPlugins,
                    workspaceInfo: workspaceInfo.map(Util.asResult),
                    pkgManagers,
                    opts: smokerOptions,
                  }),
                },
              ],
              target: 'maybeReportLingered',
            },
          ],
        },
        maybeReportLingered: {
          description:
            'Determines whether or not to report a lingering temp dir',
          always: [
            {
              guard: 'hasLingered',
              target: 'reportLingered',
            },
            'beforeExit',
          ],
        },
        reportLingered: {
          description: 'Reports the Lingered event',
          entry: {
            type: 'report',
            params: ({
              context: {lingered},
            }): DataForEvent<typeof Events.Lingered> => {
              assert.ok(lingered);
              return {
                type: Events.Lingered,
                directories: lingered,
              };
            },
          },
          always: 'beforeExit',
        },
        beforeExit: {
          description:
            'Reports the BeforeExit event, then flushes the reporters; waits until all reporters have exited cleanly to proceed',
          entry: [
            {
              type: 'report',
              params: {type: Events.BeforeExit},
            },
            log('flushing reporters...'),
            {
              type: 'flushReporters',
            },
          ],
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
          after: {
            2000: {
              actions: [
                log('Forcing shutdown; reporters did not exit cleanly'),
                'destroyAllReporterMachines',
                {
                  type: 'assignError',
                  params: () =>
                    // TODO: create a TimeoutError
                    new Error('Reporters failed to exit after 2000ms'),
                },
              ],
              target: 'errored',
            },
          },
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
        complete: {
          entry: [
            log(
              ({context: {startTime}}) =>
                `Complete in ${Util.delta(startTime)}s`,
            ),
          ],
          type: Const.FINAL,
        },
      },
      onDone: {
        target: 'stopped',
      },
    },
    noop: {
      entry: log('🤷 Nothing to do!'),
      type: Const.FINAL,
    },
    stopped: {
      type: Const.FINAL,
    },
  },
  output: ({
    self,
    context: {
      error,
      lintResults = [],
      runScriptResults = [],
      workspaceInfo,
      pkgManagers = [],
      staticPlugins,
      smokerOptions,
      aborted,
    },
  }): SmokeMachineOutput => {
    const noop = !smokerOptions.lint && isEmpty(smokerOptions.script);
    const baseOutput: CommonSmokeMachineOutput = {
      id: self.id,
      lint: lintResults,
      scripts: runScriptResults,
      workspaceInfo: workspaceInfo.map(Util.asResult),
      pkgManagers,
      opts: smokerOptions,
      plugins: staticPlugins,
      noop,
      aborted,
    };
    return error
      ? {
          type: Const.ERROR,
          error,
          ...baseOutput,
        }
      : {
          type: Const.OK,
          ...baseOutput,
        };
  },
});
