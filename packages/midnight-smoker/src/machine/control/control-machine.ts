import {
  DEFAULT_EXECUTOR_ID,
  ERROR,
  FINAL,
  OK,
  PARALLEL,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {fromUnknownError} from '#error/from-unknown-error';
import {SmokerEvent} from '#event/event-constants';
import {type DataForEvent} from '#event/events';
import {type Executor} from '#executor';
import {
  LoadableComponents,
  LoaderMachine,
  type LoaderMachineOutputOk,
} from '#machine/loader';
import {PkgManagerMachine} from '#machine/pkg-manager';
import {
  ReporterMachine,
  type ReporterMachineInput,
  type ReporterMachineOutput,
} from '#machine/reporter';
import * as MachineUtil from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginRegistry} from '#plugin/plugin-registry';
import {type LintResult} from '#schema/lint-result';
import {type RunScriptResult} from '#schema/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspaces';
import {FileManager} from '#util/filemanager';
import {uniqueId} from '#util/unique-id';
import {isEmpty, map, uniqBy} from 'lodash';
import assert from 'node:assert';
import {type PackageJson} from 'type-fest';
import {
  and,
  assign,
  enqueueActions,
  log,
  not,
  sendTo,
  setup,
  type ActorRefFrom,
} from 'xstate';
import {
  type PkgManagerInitPayload,
  type ReporterInitPayload,
  type RuleInitPayload,
} from '../loader/loader-machine-types';
import {queryWorkspaces, readSmokerPkgJson} from './control-machine-actors';
import type * as Event from './control-machine-events';
import {
  InstallBusMachine,
  type InstallBusMachineEvents,
  type InstallBusMachineInput,
} from './install-bus-machine';
import {
  LintBusMachine,
  type LintBusMachineEvents,
  type LintBusMachineInput,
} from './lint-bus-machine';
import {
  PackBusMachine,
  type PackBusMachineEvents,
  type PackBusMachineInput,
} from './pack-bus-machine';
import {
  ScriptBusMachine,
  type ScriptBusMachineEvents,
  type ScriptBusMachineInput,
} from './script-bus-machine';

export type CtrlMachineOutput = CtrlOutputOk | CtrlOutputError;

export type CtrlOutputError = MachineUtil.ActorOutputError<
  Error,
  {
    lintResults?: LintResult[];
    runScriptResults?: RunScriptResult[];
  }
>;

export type CtrlOutputOk = MachineUtil.ActorOutputOk<{
  lintResults?: LintResult[];
  runScriptResults?: RunScriptResult[];
}>;

export interface CtrlMachineContext extends CtrlMachineInput {
  defaultExecutor: Executor;
  error?: Error;
  lingered?: string[];
  fileManager: FileManager;
  lintResults?: LintResult[];
  runScriptResults?: RunScriptResult[];
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  pkgManagerMachineRefs?: Record<
    string,
    ActorRefFrom<typeof PkgManagerMachine>
  >;
  loaderMachineRefs: Record<string, ActorRefFrom<typeof LoaderMachine>>;
  reporterInitPayloads: ReporterInitPayload[];
  reporterMachineRefs: Record<string, ActorRefFrom<typeof ReporterMachine>>;
  ruleInitPayloads: RuleInitPayload[];

  /**
   * If `true`, the machine should shutdown after completing its work
   */
  shouldShutdown: boolean;

  /**
   * If `true`, the machine will tell each package manager to lint its packages
   */
  shouldLint: boolean;
  startTime: number;
  systemExecutor: Executor;
  workspaceInfo: WorkspaceInfo[];
  smokerPkgJson?: PackageJson;
  uniquePkgNames?: string[];
  pkgManagers?: StaticPkgManagerSpec[];
  packBusMachineRef?: ActorRefFrom<typeof PackBusMachine>;
  installBusMachineRef?: ActorRefFrom<typeof InstallBusMachine>;
  lintBusMachineRef?: ActorRefFrom<typeof LintBusMachine>;

  scriptBusMachineRef?: ActorRefFrom<typeof ScriptBusMachine>;
}

/**
 * Mapping of actor ID to actor reference in {@link CtrlMachineContext}
 */
const BusActorRefs = {
  PackBusMachine: 'packBusMachineRef',
  InstallBusMachine: 'installBusMachineRef',
  LintBusMachine: 'lintBusMachineRef',
  ScriptBusMachine: 'scriptBusMachineRef',
} as const;

export interface CtrlMachineInput {
  defaultExecutor?: Executor;
  fileManager?: FileManager;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  systemExecutor?: Executor;

  /**
   * If `true`, the machine should shutdown after completing its work
   */
  shouldShutdown?: boolean;
}

function delta(startTime: number): string {
  return ((performance.now() - startTime) / 1000).toFixed(2);
}

/**
 * Main state machine for the `midnight-smoker` application.
 *
 * Prior to this, plugins should already have been registered with the
 * {@link PluginRegistry}.
 */
export const ControlMachine = setup({
  types: {
    context: {} as CtrlMachineContext,
    emitted: {} as Event.CtrlMachineEmitted,
    events: {} as Event.CtrlEvents,
    input: {} as CtrlMachineInput,
    output: {} as CtrlMachineOutput,
  },
  actors: {
    ScriptBusMachine,
    PackBusMachine,
    InstallBusMachine,
    LintBusMachine,
    readSmokerPkgJson,
    queryWorkspaces,
    ReporterMachine,
    PkgManagerMachine,
    LoaderMachine,
  },
  guards: {
    hasPkgManagers: ({context: {pkgManagers}}) => !isEmpty(pkgManagers),

    hasLingered: ({context: {lingered}}) => !isEmpty(lingered),

    /**
     * If `true`, then the `LINT` event was received.
     */
    shouldLint: ({context: {shouldLint}}) => shouldLint,

    /**
     * If `true`, then the `HALT` event was received.
     */
    shouldShutdown: ({context: {shouldShutdown}}) => shouldShutdown,

    isWorkComplete: ({context: {pkgManagerMachineRefs}}) =>
      pkgManagerMachineRefs !== undefined && isEmpty(pkgManagerMachineRefs),

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
    /**
     * Assigns workspace info after {@link queryWorkspaces} has completed.
     *
     * {@link CtrlMachineContext.uniquePkgsNames} is also cached here to safe a
     * few trips through the array.
     */
    assignWorkspaceInfo: assign({
      workspaceInfo: (_, workspaceInfo: WorkspaceInfo[]) => workspaceInfo,
      uniquePkgNames: (_, workspaceInfo: WorkspaceInfo[]) =>
        map(uniqBy(workspaceInfo, 'pkgName'), 'pkgName'),
    }),

    /**
     * Sends enabled reporter system IDs to the PackBusMachine so it can begin
     * processing
     */
    beginPacking: sendTo(
      ({context: {packBusMachineRef}}) => packBusMachineRef!,
      ({context: {reporterMachineRefs}}) => ({
        type: 'PACK',
        actorIds: Object.keys(reporterMachineRefs),
      }),
    ),

    /**
     * Send enabled reporter system IDs to the InstallBusMachine so it can begin
     * processing
     */
    beginInstalling: sendTo(
      ({context: {installBusMachineRef}}) => installBusMachineRef!,
      ({context: {reporterMachineRefs}}) => ({
        type: 'INSTALL',
        actorIds: Object.keys(reporterMachineRefs),
      }),
    ),

    /**
     * Send enabled reporter system IDs to the LintBusMachine so it can begin
     * processing
     */
    beginLinting: sendTo(
      ({context: {lintBusMachineRef}}) => lintBusMachineRef!,
      ({context: {reporterMachineRefs}}) => ({
        type: 'LINT',
        actorIds: Object.keys(reporterMachineRefs),
      }),
    ),

    /**
     * Send enabled reporter system IDs to the ScriptBusMachine so it can begin
     * processing
     */
    beginRunningScripts: sendTo(
      ({context: {scriptBusMachineRef}}) => scriptBusMachineRef!,
      ({context: {reporterMachineRefs}}) => ({
        type: 'RUN_SCRIPTS',
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
            const id = uniqueId({prefix: 'LoaderMachine'});
            const actor = spawn('LoaderMachine', {
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
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),

    /**
     * Once the {@link ScriptBusMachine} emits `RunScriptsOk` or
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
        event: Event.CtrlMachineEmitted,
      ) => {
        for (const reporterMachineRef of Object.values(reporterMachineRefs)) {
          enqueue.sendTo(reporterMachineRef, {type: 'EVENT', event});
        }
        enqueue.emit(event);
      },
    ),

    shouldLint: assign({shouldLint: true}),
    shouldShutdown: assign({shouldShutdown: true}),

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
            const id = uniqueId({
              prefix: 'ReporterMachine',
              postfix: `${plugin.id}/${def.name}`,
            });
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
          },
          pkgManagerInitPayloads,
          ruleInitPayloads,
          shouldLint,
          shouldShutdown,
        },
      }) => {
        const useWorkspaces = all || !isEmpty(workspace);
        const signal = new AbortController().signal;
        const newRefs = Object.fromEntries(
          pkgManagerInitPayloads.map(({def, spec}, index) => {
            const executor = spec.isSystem ? systemExecutor : defaultExecutor;
            const id = uniqueId({
              prefix: 'PkgManagerMachine',
              postfix: `${spec}`,
            });
            const actorRef = spawn('PkgManagerMachine', {
              id,
              input: {
                spec,
                def,
                workspaceInfo,
                executor,
                fileManager,
                parentRef: self,
                linger,
                useWorkspaces,
                index: index + 1,
                signal,
                additionalDeps: [...new Set(additionalDeps)],
                scripts,
                ruleConfigs: rules,
                ruleDefs: ruleInitPayloads.map(({def}) => def),
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
        pkgManagerInitPayloads.map(({spec}) => spec.toJSON()),
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
     * Generic action to free an event bus machine reference
     */
    freeBusMachineRef: enqueueActions(
      ({enqueue}, id: keyof typeof BusActorRefs) => {
        const prop = BusActorRefs[id];
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
    resend: enqueueActions(
      (
        {enqueue, context},
        {
          id,
          event,
        }: {
          id: keyof typeof BusActorRefs;
          event:
            | PackBusMachineEvents
            | InstallBusMachineEvents
            | LintBusMachineEvents
            | ScriptBusMachineEvents;
        },
      ) => {
        const ref = context[BusActorRefs[id]];
        assert.ok(ref);
        enqueue.sendTo(ref, event);
      },
    ),
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
    return {
      defaultExecutor,
      systemExecutor,
      fileManager,
      smokerOptions,
      ...rest,
      shouldLint: smokerOptions.lint,
      loaderMachineRefs: {},
      reporterMachineRefs: {},
      shouldShutdown,
      startTime: performance.now(),
      workspaceInfo: [],
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
    };
  },
  initial: 'loading',
  entry: [log('starting control machine')],
  exit: [log('stopped')],
  always: {
    guard: 'hasError',
    actions: [log(({context: {error}}) => `ERROR: ${error?.message}`)],
    target: '.shutdown',
  },
  on: {
    HALT: {
      description:
        'Tells the machine to shutdown after finishing its work. Does NOT abort nor halt immediately',
      actions: [{type: 'shouldShutdown'}],
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
              return {
                error: output.error,
              };
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

    'xstate.done.actor.PkgManagerMachine.*': {
      description: 'Frees a PkgManagerMachine reference',
      actions: [
        {
          type: 'stopPkgManagerMachine',
          params: ({event: {output}}) => output.id,
        },
      ],
    },

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
    loading: {
      entry: [log('loading environment, plugins and components')],
      exit: [log('loading complete')],
      initial: 'queryingWorkspaces',
      states: {
        queryingWorkspaces: {
          description:
            'Gathers information about workspaces in cwd. If this is not a monorepo, we will only have a single workspace. The root workspace is ignored if we do have a monorepo.',
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
                {
                  type: 'assignWorkspaceInfo',
                  params: ({event: {output}}) => output,
                },
                log(({event: {output}}) => `found ${output.length} workspaces`),
              ],
              target: 'loadingPlugins',
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
              target: '#ControlMachine.shutdown',
            },
          },
        },
        loadingPlugins: {
          description:
            'Spawns LoaderMachines; one per plugin. These will ultimately provide the PkgManagerDef, ReporterDef and RuleDef objects',
          entry: [log('loading plugin components...'), {type: 'spawnLoaders'}],
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
                target: 'spawningEventMachines',
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
                target: '#ControlMachine.shutdown',
              },
            ],
          },
        },

        /**
         * These "event bus" machines are kept separate because this machine was
         * already huge.
         */
        spawningEventMachines: {
          description: 'Spawns machines which emit events to the reporters',
          entry: [
            assign({
              packBusMachineRef: ({
                spawn,
                context: {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                },
                self: parentRef,
              }) => {
                assert.ok(pkgManagers);
                assert.ok(uniquePkgNames);
                const input: PackBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
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
                context: {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                },
                self: parentRef,
              }) => {
                assert.ok(pkgManagers);
                assert.ok(uniquePkgNames);
                const input: InstallBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
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
                  uniquePkgNames,
                  shouldLint,
                },
                self: parentRef,
              }) => {
                // refuse to spawn if we shouldn't be linting anyway
                if (!shouldLint) {
                  return undefined;
                }
                assert.ok(pkgManagers);
                assert.ok(uniquePkgNames);
                const input: LintBusMachineInput = {
                  workspaceInfo,
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                  parentRef,
                  ruleDefs: [],
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
                context: {smokerOptions, pkgManagers, uniquePkgNames},
                self: parentRef,
              }) => {
                // refuse to spawn anything if there are no scripts requested
                if (isEmpty(smokerOptions.script)) {
                  return undefined;
                }
                assert.ok(pkgManagers);
                assert.ok(uniquePkgNames);
                const input: ScriptBusMachineInput = {
                  smokerOptions,
                  pkgManagers,
                  uniquePkgNames,
                  parentRef,
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
              guard: 'hasError',
              target: '#ControlMachine.shutdown',
            },
            {
              target: 'readSmokerPkgJson',
            },
          ],
        },
        readSmokerPkgJson: {
          description: 'Reads our own package.json file (for use by reporters)',
          invoke: {
            src: 'readSmokerPkgJson',
            input: ({context: {fileManager}}) => fileManager,
            onDone: {
              target: 'spawningComponents',
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
              target: '#ControlMachine.shutdown',
            },
          },
        },
        spawningComponents: {
          description:
            'From components registered via plugins, Spawns PkgManagerMachines (one per PkgManagerDef) and ReporterMachines (one per ReporterDef)',
          // TODO: ensure pkg manager doesn't start emitting events before the PackBusMachine is ready
          entry: [
            {
              type: 'spawnComponentMachines',
            },
          ],
          exit: [
            {
              type: 'freeInitPayloads',
            },
          ],
          always: [
            {
              guard: 'hasError',
              target: '#ControlMachine.shutdown',
            },
            {
              target: 'done',
            },
          ],
        },
        done: {
          type: FINAL,
        },
      },
      onDone: {
        target: '#ControlMachine.working',
      },
    },

    working: {
      description:
        'This is where things actually happen. First thing is to emit `SmokeBegin`',
      entry: [
        {
          type: 'report',
          params: ({
            context: {pluginRegistry, smokerOptions},
          }): DataForEvent<typeof SmokerEvent.SmokeBegin> => ({
            type: SmokerEvent.SmokeBegin,
            plugins: pluginRegistry.plugins.map((plugin) => plugin.toJSON()),
            opts: smokerOptions,
          }),
        },
      ],
      type: PARALLEL,
      states: {
        packing: {
          initial: 'working',
          states: {
            working: {
              description:
                'Tells the PackBusMachine to emit PackBegin and start listening for events coming out of the PkgManagerMachines',
              entry: [
                {
                  type: 'beginPacking',
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
              ],
              exit: [{type: 'freeBusMachineRef', params: 'PackBusMachine'}],
              on: {
                'PACK.*': {
                  actions: [
                    {
                      type: 'resend',
                      params: ({event}) => ({id: 'PackBusMachine', event}),
                    },
                  ],
                },
                [SmokerEvent.PackOk]: {
                  target: 'done',
                },
                [SmokerEvent.PackFailed]: {
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
        installing: {
          initial: 'idle',
          states: {
            idle: {
              on: {
                'PACK.PKG_PACK_OK': {
                  target: 'working',
                },
              },
            },
            working: {
              entry: [
                {
                  type: 'beginInstalling',
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
              ],
              exit: [
                {
                  type: 'freeBusMachineRef',
                  params: 'InstallBusMachine',
                },
              ],
              on: {
                'INSTALL.*': {
                  actions: [
                    {
                      type: 'resend',
                      params: ({event}) => ({id: 'InstallBusMachine', event}),
                    },
                  ],
                },
                [SmokerEvent.InstallOk]: {
                  target: 'done',
                },
                [SmokerEvent.InstallFailed]: {
                  target: 'errored',
                },
              },
            },
            errored: {
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
              always: [
                {
                  guard: not('shouldLint'),
                  target: 'done',
                },
              ],
              on: {
                'INSTALL.PKG_INSTALL_OK': {
                  target: 'working',
                },
              },
            },
            working: {
              entry: [
                {
                  type: 'beginLinting',
                },
              ],
              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
              ],
              exit: [{type: 'freeBusMachineRef', params: 'LintBusMachine'}],
              on: {
                'LINT.*': {
                  actions: [
                    {
                      type: 'resend',
                      params: ({event}) => ({id: 'LintBusMachine', event}),
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
              always: [
                {
                  guard: not('shouldRunScripts'),
                  target: 'done',
                },
              ],
              on: {
                'INSTALL.PKG_INSTALL_OK': {
                  target: 'working',
                },
              },
            },
            working: {
              entry: [
                {
                  type: 'beginRunningScripts',
                },
              ],

              always: [
                {
                  guard: 'hasError',
                  target: 'errored',
                },
              ],

              exit: [{type: 'freeBusMachineRef', params: 'ScriptBusMachine'}],
              on: {
                'SCRIPT.*': {
                  actions: [
                    {
                      type: 'resend',
                      params: ({event}) => ({id: 'ScriptBusMachine', event}),
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
                [SmokerEvent.RunScriptsFailed]: {
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
      initial: 'idle',
      states: {
        idle: {
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
                `complete (with error) in ${delta(startTime)}s`,
            ),
          ],
          type: FINAL,
        },
        complete: {
          entry: [
            log(({context: {startTime}}) => `complete in ${delta(startTime)}s`),
          ],
          type: FINAL,
        },
      },
      onDone: {
        target: 'stopped',
      },
    },
    stopped: {
      type: FINAL,
    },
  },
  output: ({
    self: {id},
    context: {error, lintResults, runScriptResults},
  }): CtrlMachineOutput =>
    error
      ? {type: ERROR, id, error, lintResults, runScriptResults}
      : {type: OK, id, lintResults, runScriptResults},
});
