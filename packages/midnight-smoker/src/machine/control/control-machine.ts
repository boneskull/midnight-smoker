import {
  DEFAULT_EXECUTOR_ID,
  ERROR,
  FAILED,
  FINAL,
  OK,
  PARALLEL,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {MachineError} from '#error/machine-error';
import {PrivateWorkspaceError} from '#error/private-workspace-error';
import {SmokeError} from '#error/smoke-error';
import {UnsupportedPackageManagerError} from '#error/unsupported-pkg-manager-error';
import {SmokerEvent} from '#event/event-constants';
import {type DataForEvent} from '#event/events';
import {
  LoadableComponents,
  LoaderMachine,
  type LoaderMachineOutputOk,
} from '#machine/loader';
import {
  PkgManagerMachine,
  type PkgManagerMachineOutput,
} from '#machine/pkg-manager';
import {
  ReporterMachine,
  type ReporterMachineInput,
  type ReporterMachineOutput,
} from '#machine/reporter';
import * as MachineUtil from '#machine/util';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type LintResult, type LintResultFailed} from '#schema/lint-result';
import {
  type RunScriptResult,
  type RunScriptResultFailed,
} from '#schema/run-script-result';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {fromUnknownError, isSmokerError} from '#util/error-util';
import {FileManager} from '#util/filemanager';
import {normalizeInstallables} from '#util/normalize-installables';
import {asResult} from '#util/result';
import {serialize} from '#util/serialize';
import {delta} from '#util/util';
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
} from 'xstate';
import * as CtrlActor from './control-machine-actors';
import type * as Event from './control-machine-events';
import {
  type BaseCtrlMachineOutput,
  type CtrlMachineContext,
  type CtrlMachineInput,
  type CtrlMachineOutput,
} from './control-machine-types';
import * as InstallBus from './install-bus-machine';
import * as LintBus from './lint-bus-machine';
import * as PackBus from './pack-bus-machine';
import * as ScriptBus from './script-bus-machine';

/**
 * The name of bus actor reference props in {@link CtrlMachineContext}.
 *
 * @see {@link BusActors}
 */
type BusActorProp = ValueOf<typeof BusActors>;

/**
 * Mapping of actor ID to actor reference prop in {@link CtrlMachineContext}.
 *
 * Used for various actions performing common tasks on bus machines.
 */
const BusActors = Object.freeze({
  PackBusMachine: 'packBusMachineRef',
  InstallBusMachine: 'installBusMachineRef',
  LintBusMachine: 'lintBusMachineRef',
  ScriptBusMachine: 'scriptBusMachineRef',
} as const);

/**
 * Main state machine for the `midnight-smoker` application.
 *
 * Prior to this, plugins should already have been registered with the
 * {@link PluginRegistry}.
 */
export const ControlMachine = setup({
  types: {
    context: {} as CtrlMachineContext,
    emitted: {} as Event.CtrlEventEmitted,
    events: {} as Event.CtrlEvent,
    input: {} as CtrlMachineInput,
    output: {} as CtrlMachineOutput,
  },
  actors: {
    ScriptBusMachine: ScriptBus.ScriptBusMachine,
    PackBusMachine: PackBus.PackBusMachine,
    InstallBusMachine: InstallBus.InstallBusMachine,
    LintBusMachine: LintBus.LintBusMachine,
    readSmokerPkgJson: CtrlActor.readSmokerPkgJson,
    queryWorkspaces: CtrlActor.queryWorkspaces,
    ReporterMachine,
    PkgManagerMachine,
    LoaderMachine,
  },
  guards: {
    allPrivateWorkspaces: (
      {
        context: {
          smokerOptions: {allowPrivate},
        },
      },
      workspaceInfo: WorkspaceInfo[],
    ) => !allowPrivate && workspaceInfo.every(({pkgJson}) => pkgJson.private),
    isAborted: ({context: {aborted}}) => Boolean(aborted),

    isNoop: and([not('shouldLint'), not('shouldRunScripts')]),

    /**
     * Returns `true` if linting or script execution failed
     */
    didFail: ({context: {lintResults = [], runScriptResults = []}}) =>
      lintResults.some(({type}) => type === FAILED) ||
      runScriptResults.some(({type}) => type === FAILED),

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
     * If `true`, then the `HALT` event was received.
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
    abort: raise({type: 'ABORT'}),
    aborted: assign({aborted: true}),
    appendPkgManagerMachineOutput: assign({
      pkgManagerMachinesOutput: (
        {context: {pkgManagerMachinesOutput}},
        output: PkgManagerMachineOutput,
      ) => {
        return [...pkgManagerMachinesOutput, output];
      },
    }),

    /**
     * Assigns workspace info after {@link CtrlActor.queryWorkspaces} has
     * completed.
     *
     * {@link CtrlMachineContext.uniquePkgsNames} is also cached here to safe a
     * few trips through the array.
     */
    assignWorkspaceInfo: assign({
      workspaceInfo: (_, workspaceInfo: WorkspaceInfo[]) => workspaceInfo,
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
      ({context: {reporterMachineRefs}}): Event.ListenEvent => ({
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
      lingered: ({context: {lingered = []}}, directory: string) => {
        return [...lingered, directory];
      },
    }),

    /**
     * Overwrite lint results
     */
    assignLintResults: assign({
      lintResults: (_, lintResults: LintResult[]) => lintResults,
    }),

    /**
     * Overwrite script results
     */
    assignRunScriptResults: assign({
      runScriptResults: (_, runScriptResults: RunScriptResult[]) =>
        runScriptResults,
    }),

    /**
     * Spawns a {@link LoaderMachine} for each plugin
     */
    spawnLoaders: assign({
      loaderMachineRefs: ({
        context: {pluginRegistry, smokerOptions, workspaceInfo},
        spawn,
      }) =>
        Object.fromEntries(
          pluginRegistry.plugins.map((plugin) => {
            const id = `LoaderMachine.[${plugin.id}]`;
            const actor = spawn('LoaderMachine', {
              id,
              input: {
                plugin,
                pluginRegistry,
                workspaceInfo,
                smokerOptions,
                component: LoadableComponents.All,
              },
            });

            return [id, MachineUtil.monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),

    /**
     * Stops a given {@link LoaderMachine}
     */
    stopLoader: enqueueActions(
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
      ({enqueue, context: {reporterMachineRefs}}) => {
        Object.values(reporterMachineRefs).forEach((reporterMachine) => {
          enqueue.sendTo(reporterMachine, {type: 'HALT'});
        });
      },
    ),

    /**
     * Creates or updates an aggregate {@link SmokerError}.
     *
     * If an aggregate {@link MachineError} is passed, the errors within it will
     * be dereferenced.
     */
    assignError: assign({
      error: ({self, context}, error: Error | Error[]) => {
        if (isSmokerError(MachineError, error)) {
          error = error.errors;
        }
        if (context.error) {
          return context.error.cloneWith(error);
        }
        return new MachineError('Fatal error', error, self.id);
      },
    }),

    /**
     * Once the {@link ScriptBus.ScriptBusMachine} emits `RunScriptsOk` or
     * `RunScriptsFailed`, we retain the results for output
     * ({@link CtrlMachineOutput})
     */
    appendRunScriptResult: assign({
      runScriptResults: (
        {context: {runScriptResults = []}},
        runScriptResult: RunScriptResult,
      ) => {
        return [...runScriptResults, runScriptResult];
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
     * Sends an event to all of the reporter machines.
     *
     * Also emits the same event.
     */
    report: enqueueActions(
      (
        {enqueue, context: {reporterMachineRefs}},
        event: Event.CtrlEventEmitted,
      ) => {
        enqueue.emit(event);
        for (const reporterMachineRef of Object.values(reporterMachineRefs)) {
          enqueue.sendTo(reporterMachineRef, {type: 'EVENT', event});
        }
      },
    ),

    /**
     * Assigns `true` to
     * {@link CtrlMachineContext.shouldShutdown shouldShutdown}.
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
     *    {@link CtrlMachineContext.smokerPkgJson smokerPkgJson}
     * 2. The `LoaderMachine` will have completed successfully and output the "init
     *    payload" objects, assigned to
     *    {@link CtrlMachineContext.pkgManagerInitPayloads pkgManagerInitPayloads}
     *    and
     *    {@link CtrlMachineContext.reporterInitPayloads reporterInitPayloads}
     * 3. Workspaces will have been queried and assigned to
     *    {@link CtrlMachineContext.workspaceInfo workspaceInfo}
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
                plugin: serialize(plugin),
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
            return [id, MachineUtil.monkeypatchActorLogger(actorRef, id)];
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

    /**
     * Upon receiving initialization data from the {@link LoaderMachine}, this
     * overwrites the context props with the data.
     *
     * In addition, it creates {@link CtrlMachineContext.pkgManagers}, which is
     * just some sugar for keeping references to {@link StaticPkgManagerSpec}
     * objects, which are often used by events.
     */
    assignInitPayloads: assign({
      reporterInitPayloads: (
        _,
        {reporterInitPayloads}: LoaderMachineOutputOk,
      ) => reporterInitPayloads,
      pkgManagerInitPayloads: (
        _,
        {pkgManagerInitPayloads}: LoaderMachineOutputOk,
      ) => pkgManagerInitPayloads,
      ruleInitPayloads: (_, {ruleInitPayloads}: LoaderMachineOutputOk) =>
        ruleInitPayloads,
      pkgManagers: (_, {pkgManagerInitPayloads}: LoaderMachineOutputOk) =>
        pkgManagerInitPayloads.map(({spec}) => serialize(spec)),
    }),

    /**
     * After the init payloads have been used to spawn
     * {@link ReporterMachine ReporterMachines} and
     * {@link PkgManagerMachine PkgManagerMachines}, we can safely drop the data
     * from the context.
     */
    freeInitPayloads: assign({
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
    }),

    /**
     * Generic action to free an event bus machine reference (and stop the
     * machine)
     */
    freeBusMachineRef: enqueueActions(
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
     * `ControlMachine`). This forwards those events to the appropriate event
     * bus machine.
     *
     * In some cases, the `ControlMachine` needs to take action based on the
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
            | PackBus.PackBusMachineEvents
            | InstallBus.InstallBusMachineEvents
            | LintBus.LintBusMachineEvents
            | ScriptBus.ScriptBusMachineEvent;
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
        const normalizedAdds = normalizeInstallables(add, workspaceInfo);
        return {...smokerOptions, add: normalizedAdds};
      },
    }),
    stopAllChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      for (const child of Object.keys(snapshot.children)) {
        enqueue.stopChild(child);
      }
    }),
  },
}).createMachine({
  id: 'ControlMachine',
  context: ({
    input: {
      fileManager,
      defaultExecutor,
      systemExecutor,
      smokerOptions,
      shouldShutdown = false,
      ...rest
    },
  }): CtrlMachineContext => {
    defaultExecutor ??= rest.pluginRegistry.getExecutor(DEFAULT_EXECUTOR_ID);
    systemExecutor ??= rest.pluginRegistry.getExecutor(SYSTEM_EXECUTOR_ID);
    fileManager ??= FileManager.create();
    const staticPlugins: CtrlMachineContext['staticPlugins'] = serialize(
      rest.pluginRegistry.plugins,
    );
    const startTime: CtrlMachineContext['startTime'] = performance.now();
    return {
      ...rest,
      defaultExecutor,
      systemExecutor,
      fileManager,
      smokerOptions,
      shouldShutdown,
      staticPlugins,
      startTime,
      loaderMachineRefs: {},
      reporterMachineRefs: {},
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
  always: {
    guard: 'hasError',
    actions: [
      log(({context: {error}}) => {
        let msg = `❌ ERROR`;
        if (error?.message) {
          msg += `: ${error.message}`;
        }
        return msg;
      }),
    ],
  },
  on: {
    ABORT: {
      description:
        'Immediately stops all children then begins shutdown procedure',
      actions: [
        {
          type: 'report',
          params: ({
            event: {reason},
          }): DataForEvent<typeof SmokerEvent.Aborted> => {
            return {
              type: SmokerEvent.Aborted,
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
        'stopAllChildren',
        'aborted',
      ],
      target: '.shutdown',
    },
    HALT: {
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
              MachineUtil.assertActorOutputNotOk(output);
              return output.error;
            },
          },
          {type: 'stopReporterMachine', params: ({event}) => event},
        ],
        target: '#ControlMachine.shutdown',
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
            type: 'stopPkgManagerMachine',
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
              MachineUtil.assertActorOutputNotOk(output);
              return output.error;
            },
          },
          {
            type: 'stopPkgManagerMachine',
            params: ({event: {output}}) => output.id,
          },
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
            'Gathers information about the environment and spawns a LoaderMachine for each plugin, which provides the enabled components that the plugin adds',
          type: PARALLEL,
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
                    }): CtrlActor.QueryWorkspacesInput => ({
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
                              new PrivateWorkspaceError(
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
                          params: ({event: {error}}) => fromUnknownError(error),
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
                  entry: ['abort'],
                  type: FINAL,
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
                    input: ({context: {fileManager}}) => ({fileManager}),
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
                          params: ({event: {error}}) => fromUnknownError(error),
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
            },
            loadingPlugins: {
              entry: log('Spawning LoaderMachine'),
              initial: 'loading',
              states: {
                loading: {
                  description:
                    'Spawns LoaderMachines; one per plugin. These will ultimately provide the PkgManagerDef, ReporterDef and RuleDef objects',
                  entry: 'spawnLoaders',
                  on: {
                    'xstate.done.actor.LoaderMachine.*': [
                      {
                        description:
                          'Assigns init payloads (from LoaderMachine output) to the context',
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
                        target: 'done',
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
                              return output.error;
                            },
                          },
                        ],
                        target: 'errored',
                      },
                    ],
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
            },
          },
          onDone: [
            {
              guard: 'notHasError',
              target: 'validatePkgManagers',
            },
            {
              guard: 'hasError',
              actions: [log('Refusing to validate package managers!')],
            },
          ],
        },

        validatePkgManagers: {
          description:
            'Once the pkg managers have been loaded, we need to cross-reference them with the desired package managers--and fail if any are missing',
          entry: [
            enqueueActions(
              ({
                enqueue,
                context: {
                  smokerOptions: {pkgManager: desiredPkgManagers = []},
                  pkgManagerInitPayloads,
                },
              }) => {
                const unsupportedPkgManagers = PkgManagerSpec.filterUnsupported(
                  pkgManagerInitPayloads.map(
                    ({spec}) => spec,
                    desiredPkgManagers,
                  ),
                );

                for (const unsupported of unsupportedPkgManagers) {
                  enqueue({
                    type: 'assignError',
                    params: new UnsupportedPackageManagerError(
                      `No package manager implementation found that can handle "${unsupported}"`,
                      unsupported,
                    ),
                  });
                }
                if (!isEmpty(unsupportedPkgManagers)) {
                  enqueue('abort');
                }
              },
            ),
          ],
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
          entry: [
            assign({
              packBusMachineRef: ({
                spawn,
                context: {workspaceInfo, smokerOptions, pkgManagers},
                self: parentRef,
              }) => {
                assert.ok(pkgManagers);
                const input: PackBus.PackBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  parentRef,
                };
                const actor = spawn('PackBusMachine', {
                  input,
                  systemId: 'PackBusMachine',
                });
                return MachineUtil.monkeypatchActorLogger(
                  actor,
                  'PackBusMachine',
                );
              },
              installBusMachineRef: ({
                spawn,
                context: {workspaceInfo, smokerOptions, pkgManagers},
                self: parentRef,
              }) => {
                assert.ok(pkgManagers);
                const input: InstallBus.InstallBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  parentRef,
                };
                const actor = spawn('InstallBusMachine', {
                  input,
                  systemId: 'InstallBusMachine',
                });
                return MachineUtil.monkeypatchActorLogger(
                  actor,
                  'InstallBusMachine',
                );
              },
              lintBusMachineRef: ({
                spawn,
                context: {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  ruleInitPayloads,
                },
                self: parentRef,
              }) => {
                // refuse to spawn if we shouldn't be linting anyway
                if (!smokerOptions.lint) {
                  return undefined;
                }
                assert.ok(pkgManagers);
                const input: LintBus.LintBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  parentRef,
                  ruleDefs: ruleInitPayloads.map(({def}) => def),
                };
                const actor = spawn('LintBusMachine', {
                  input,
                  systemId: 'LintBusMachine',
                });
                return MachineUtil.monkeypatchActorLogger(
                  actor,
                  'LintBusMachine',
                );
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
                const input: ScriptBus.ScriptBusMachineInput = {
                  smokerOptions,
                  pkgManagers,
                  parentRef,
                  workspaceInfo,
                };
                const actor = spawn('ScriptBusMachine', {
                  input,
                  systemId: 'ScriptBusMachine',
                });
                return MachineUtil.monkeypatchActorLogger(
                  actor,
                  'ScriptBusMachine',
                );
              },
            }),
          ],
          always: [
            {
              guard: 'notHasError',
              target: 'spawningComponents',
            },
            {
              guard: 'hasError',
              actions: [log('Refusing to spawn components!')],
            },
          ],
        },
        spawningComponents: {
          description:
            'From components registered via plugins, Spawns PkgManagerMachines (one per PkgManagerDef) and ReporterMachines (one per ReporterDef)',
          // TODO: ensure pkg manager doesn't start emitting events before the PackBusMachine is ready
          entry: 'spawnComponentMachines',
          exit: 'freeInitPayloads',
          always: [
            {
              guard: 'hasError',
              target: 'errored',
            },
            {
              guard: 'notHasError',
              target: 'done',
            },
          ],
        },
        errored: {
          entry: 'abort',
          type: FINAL,
        },
        done: {
          type: FINAL,
        },
      },
      onDone: [
        {
          guard: 'notHasError',
          target: '#ControlMachine.working',
        },
        {
          guard: 'hasError',
          actions: log('Refusing to pack!'),
        },
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
          }): DataForEvent<typeof SmokerEvent.SmokeBegin> => {
            assert.ok(pkgManagers);
            return {
              type: SmokerEvent.SmokeBegin,
              plugins: staticPlugins,
              opts: smokerOptions,
              workspaceInfo: workspaceInfo.map(asResult),
              pkgManagers,
            };
          },
        },
      ],
      type: PARALLEL,
      states: {
        packing: {
          initial: 'listening',
          states: {
            listening: {
              description:
                'Tells the PackBusMachine to emit PackBegin and start listening for events coming out of the PkgManagerMachines',
              entry: {
                type: 'listen',
                params: BusActors.PackBusMachine,
              },
              always: {
                guard: 'hasError',
                target: 'errored',
              },
              exit: {
                type: 'freeBusMachineRef',
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
                [SmokerEvent.PackOk]: 'done',
                [SmokerEvent.PackFailed]: {
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
                type: 'freeBusMachineRef',
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
                [SmokerEvent.InstallOk]: 'done',
                [SmokerEvent.InstallFailed]: 'errored',
              },
            },
            errored: {
              entry: 'abort',
              type: FINAL,
            },
            done: {
              type: FINAL,
            },
          },
        },

        linting: {
          initial: 'idle',
          states: {
            idle: {
              always: {
                guard: not('shouldLint'),
                target: 'done',
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
                type: 'freeBusMachineRef',
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
                [SmokerEvent.LintOk]: {
                  actions: [
                    {
                      type: 'assignLintResults',
                      params: ({event: {results}}) => results,
                    },
                  ],
                  target: 'done',
                },
                [SmokerEvent.LintFailed]: {
                  actions: [
                    {
                      type: 'assignLintResults',
                      params: ({event: {results}}) => results,
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
        },
        running: {
          initial: 'idle',
          states: {
            idle: {
              always: {
                guard: not('shouldRunScripts'),
                target: 'done',
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
                type: 'freeBusMachineRef',
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
                [SmokerEvent.RunScriptsOk]: {
                  actions: [
                    {
                      type: 'assignRunScriptResults',
                      params: ({event}) => event.results,
                    },
                  ],
                  target: 'done',
                },
                [SmokerEvent.RunScriptsFailed]: 'errored',
              },
            },
            done: {
              type: FINAL,
            },
            errored: {
              type: FINAL,
            },
          },
        },
      },
      always: [
        {
          // we begin the shutdown process when 1. the shouldShutdown flag is true, and 2. when all pkg managers have shut themselves down.
          guard: and(['shouldShutdown', 'isWorkComplete']),
          target: '#ControlMachine.shutdown',
        },
      ],
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
                  }): DataForEvent<typeof SmokerEvent.SmokeError> => {
                    assert.ok(error);
                    const smokeError = new SmokeError(error.errors, {
                      lint: lintResults,
                      script: runScriptResults,
                    });
                    return {
                      type: SmokerEvent.SmokeError,
                      lint: lintResults,
                      scripts: runScriptResults,
                      error: smokeError,
                      plugins: staticPlugins,
                      pkgManagers,
                      workspaceInfo: workspaceInfo.map(asResult),
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
                  }): DataForEvent<typeof SmokerEvent.SmokeFailed> => {
                    const scriptFailed = runScriptResults.filter(
                      ({type}) => type === FAILED,
                    ) as RunScriptResultFailed[];
                    const lintFailed = lintResults.filter(
                      ({type}) => type === FAILED,
                    ) as LintResultFailed[];
                    assert.ok(pkgManagers);
                    return {
                      type: SmokerEvent.SmokeFailed,
                      lint: lintResults,
                      scripts: runScriptResults,
                      scriptFailed,
                      lintFailed,
                      plugins: staticPlugins,
                      workspaceInfo: workspaceInfo.map(asResult),
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
                  }): DataForEvent<typeof SmokerEvent.SmokeOk> => ({
                    type: SmokerEvent.SmokeOk,
                    lint: lintResults,
                    scripts: runScriptResults,
                    plugins: staticPlugins,
                    workspaceInfo: workspaceInfo.map(asResult),
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
              guard: {type: 'hasLingered'},
              target: 'reportLingered',
            },
            {
              guard: not('hasLingered'),
              target: 'beforeExit',
            },
          ],
        },
        reportLingered: {
          description: 'Reports the Lingered event',
          always: {
            actions: [
              {
                type: 'report',
                params: ({
                  context: {lingered},
                }): DataForEvent<typeof SmokerEvent.Lingered> => {
                  assert.ok(lingered);
                  return {type: SmokerEvent.Lingered, directories: lingered};
                },
              },
            ],
            target: 'beforeExit',
          },
        },
        beforeExit: {
          description:
            'Reports the BeforeExit event, then flushes the reporters; waits until all reporters have exited cleanly to proceed',
          entry: [
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
              guard: and(['hasError', not('hasReporterRefs')]),
              target: 'errored',
            },
            {
              guard: and(['notHasError', not('hasReporterRefs')]),
              target: 'complete',
            },
          ],
        },
        errored: {
          entry: [
            log(
              ({context: {startTime}}) =>
                `Completed (with error) in ${delta(startTime)}s`,
            ),
          ],
          type: FINAL,
        },
        complete: {
          entry: [
            log(({context: {startTime}}) => `Complete in ${delta(startTime)}s`),
          ],
          type: FINAL,
        },
      },
      onDone: {
        target: 'stopped',
      },
    },
    noop: {
      entry: log('🤷 Nothing to do!'),
      type: FINAL,
    },
    stopped: {
      type: FINAL,
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
  }): CtrlMachineOutput => {
    const noop = !smokerOptions.lint && isEmpty(smokerOptions.script);
    const baseOutput: BaseCtrlMachineOutput = {
      id: self.id,
      lint: lintResults,
      scripts: runScriptResults,
      workspaceInfo: workspaceInfo.map(asResult),
      pkgManagers,
      opts: smokerOptions,
      plugins: staticPlugins,
      noop,
      aborted,
    };
    return error
      ? {
          type: ERROR,
          error,
          ...baseOutput,
        }
      : {
          type: OK,
          ...baseOutput,
        };
  },
});
