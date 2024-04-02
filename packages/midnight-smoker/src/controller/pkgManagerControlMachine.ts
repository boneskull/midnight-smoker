import {type InstallManifest} from '#schema/install-manifest';
import Debug from 'debug';
import {type SetRequired} from 'type-fest';
import {
  assign,
  emit,
  enqueueActions,
  log,
  not,
  setup,
  type ActorRefFrom,
} from 'xstate';
import {
  type InstallOkEventData,
  type InstallResult,
  type PackBeginEventData,
  type PackOkEventData,
  type PackOptions,
  type PkgManager,
  type RunScriptManifest,
  type ScriptError,
} from '../component';
import {type Executor} from '../component/executor';
import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '../constants';
import {fromUnknownError} from '../error';
import {
  SmokerEvent,
  type RunScriptSkippedEventData,
  type RunScriptsBeginEventData,
  type ScriptBeginEventData,
  type ScriptFailedEventData,
  type ScriptOkEventData,
} from '../event';
import {type PluginRegistry} from '../plugin/plugin-registry';
import {FileManager, type FileManagerOpts} from '../util/filemanager';
import {PkgManagerControllerEventHelper} from './pkg-manager-controller-event-helper';
import {
  pkgManagerLoaderMachine,
  type PMLMOutput,
} from './pkgManagerLoaderMachine';
import {pkgManagerMachine} from './pkgManagerMachine';
import {type SRMOutput} from './scriptRunnerMachine';

export type PMCtrlEvents =
  | PMCtrlInitEvent
  | PMCtrlPackEvent
  | PMCtrlPackedEvent
  | PMCtrlLoadedEvent
  | PMCtrlInstalledEvent
  | PMCtrlRunScriptsEvent
  | PMCtrlPkgManagerLoaderDoneEvent
  | PMCtrlRunScriptFailedEvent
  | PMCtrlPkgManagerDoneEvent
  | PMCtrlWillRunScriptsEvent
  | PMCtrlWillRunScriptEvent
  | PMCtrlDidRunScriptEvent;
type PMCtrlMachineContext = Omit<
  SetRequired<PMCtrlMachineInput, 'cwd' | 'linger'>,
  'defaultExecutorId' | 'systemExecutorId' | 'fileManagerOpts'
> & {
  pkgManagers: PkgManager[];
  defaultExecutor: Executor;
  systemExecutor: Executor;
  fm: FileManager;
  pkgManagerMachines: Map<string, ActorRefFrom<typeof pkgManagerMachine>>;
  needsRunning: number;
  scripts?: string[];
  loader?: ActorRefFrom<typeof pkgManagerLoaderMachine>;
  error?: Error;
  currentScript?: number;
  totalScripts?: number;
};

export interface PMCtrlDidRunScriptEvent {
  output: SRMOutput;
  type: 'DID_RUN_SCRIPT';
}

export interface PMCtrlExternalRunScriptBeginEvent
  extends ScriptBeginEventData {
  type: typeof SmokerEvent.RunScriptBegin;
}

export interface PMCtrlExternalRunScriptFailedEvent
  extends ScriptFailedEventData {
  type: typeof SmokerEvent.RunScriptFailed;
}

export interface PMCtrlExternalRunScriptOkEvent extends ScriptOkEventData {
  type: typeof SmokerEvent.RunScriptOk;
}

export interface PMCtrlExternalRunScriptSkippedEvent
  extends RunScriptSkippedEventData {
  type: typeof SmokerEvent.RunScriptSkipped;
}

export interface PMCtrlExternalRunScriptsBeginEvent
  extends RunScriptsBeginEventData {
  type: typeof SmokerEvent.RunScriptsBegin;
}

export interface PMCtrlExternalPackBeginEvent extends PackBeginEventData {
  type: typeof SmokerEvent.PackBegin;
}

export interface PMCtrlExternalPackOkEvent extends PackOkEventData {
  type: typeof SmokerEvent.PackOk;
}
export interface PMCtrlExternalInstallOkEvent extends InstallOkEventData {
  type: typeof SmokerEvent.InstallOk;
}

interface PMCtrlInitEvent {
  type: 'INIT';
}

export interface PMCtrlInstalledEvent {
  installResult: InstallResult;
  sender: string;
  type: 'INSTALLED';
}

interface PMCtrlLoadedEvent {
  pkgManagers: PkgManager[];
  type: 'LOADED';
}

export interface PMCtrlMachineInput {
  cwd?: string;
  defaultExecutorId?: string;
  desiredPkgManagers: string[];
  fileManagerOpts?: FileManagerOpts;
  linger?: boolean;
  packOptions?: PackOptions;
  pluginRegistry: PluginRegistry;
  systemExecutorId?: string;
}

interface PMCtrlPackEvent {
  opts?: PackOptions;
  type: 'PACK';
}

export interface PMCtrlPackedEvent {
  installManifests: InstallManifest[];
  sender: string;
  type: 'PACKED';
}

interface PMCtrlPkgManagerDoneEvent {
  output: {error?: Error};
  type: 'xstate.done.actor.pkgManager.*';
}

interface PMCtrlPkgManagerLoaderDoneEvent {
  output: PMLMOutput;
  type: 'xstate.done.actor.pkgManagerLoader';
}

export interface PMCtrlRunScriptFailedEvent {
  current: number;
  error: ScriptError;
  runScriptManifest: RunScriptManifest;
  total: number;
  type: 'RUN_SCRIPT_FAILED';
}

interface PMCtrlRunScriptsEvent {
  scripts: string[];
  type: 'RUN_SCRIPTS';
}

export interface PMCtrlWillRunScriptEvent {
  pkgManagerIndex: number;
  runScriptManifest: RunScriptManifest;
  scriptIndex: number;
  type: 'WILL_RUN_SCRIPT';
}

export interface PMCtrlWillRunScriptsEvent {
  pkgManagers: PkgManager[];
  scripts: string[];
  type: 'WILL_RUN_SCRIPTS';
}

export const makeId = () => Math.random().toString(36).substring(7);
export const pkgManagerControlMachine = setup({
  types: {
    context: {} as PMCtrlMachineContext,
    events: {} as PMCtrlEvents,
    output: {} as {error?: Error},
    input: {} as PMCtrlMachineInput,
  },
  actors: {
    pkgManager: pkgManagerMachine,
    pkgManagerLoader: pkgManagerLoaderMachine,
  },
  guards: {
    hasLoadError: (_, {type}: PMLMOutput) => type === 'ERROR',
    hasPkgManagerLoader: ({context: {loader}}) => loader !== undefined,
    hasPkgManagers: ({context}) => context.pkgManagers.length > 0,
    hasError: ({context: {error}}) => error !== undefined,
    preparationComplete: ({context: {pkgManagerMachines}}) =>
      [...pkgManagerMachines.values()].every((machine) =>
        machine.getSnapshot().matches('ready'),
      ),
    runScriptsComplete: ({context: {needsRunning}}) => needsRunning === 0,
    notHasError: not('hasError'),
    loadedOk: (_, {type}: PMLMOutput) => type === 'OK',
  },
  actions: {
    // TODO: aggregate for multiple
    assignError: assign({
      error: ({context: {error}}, params: {error?: unknown}) =>
        params.error ? fromUnknownError(params.error) : error,
    }),
    decrementNeedsRunning: assign({
      needsRunning: ({context: {needsRunning}}) => needsRunning - 1,
    }),
    assignNeedsRunning: assign({
      needsRunning: ({context: {pkgManagerMachines}}) =>
        pkgManagerMachines.size,
    }),
    emitPackOk: emit(
      ({context: {pkgManagers}}): PMCtrlExternalPackOkEvent => ({
        type: SmokerEvent.PackOk,
        ...PkgManagerControllerEventHelper.buildInstallEventData(pkgManagers),
      }),
    ),
    eventLogger: log(({event}) => `received evt ${event.type}`),
    stopPkgManagerMachines: enqueueActions(
      ({enqueue, context: {pkgManagerMachines}}) => {
        for (const machine of pkgManagerMachines.values()) {
          enqueue.stopChild(machine);
        }
        enqueue.assign({pkgManagerMachines: new Map()});
      },
    ),
    scriptsBegin: enqueueActions(
      (
        {enqueue, context: {pkgManagerMachines, pkgManagers}},
        {scripts}: {scripts: string[]},
      ) => {
        let total = 0;

        const manifest = Object.fromEntries(
          pkgManagers.map((pkgManager) => {
            const runScriptManifests =
              pkgManager.buildRunScriptManifests(scripts);
            total += runScriptManifests.length;
            return [`${pkgManager.spec}`, runScriptManifests];
          }),
        );

        const evt: PMCtrlExternalRunScriptsBeginEvent = {
          type: SmokerEvent.RunScriptsBegin,
          manifest,
          total,
        };
        enqueue.emit(evt);
        enqueue.assign({
          totalScripts: total,
        });

        for (const machine of pkgManagerMachines.values()) {
          enqueue.sendTo(machine, {type: 'RUN_SCRIPTS', scripts});
        }
      },
    ),
    scriptBegin: emit(
      (
        {context: {totalScripts}},
        {
          runScriptManifest,
          scriptIndex,
          pkgManagerIndex,
        }: PMCtrlWillRunScriptEvent,
      ): PMCtrlExternalRunScriptBeginEvent => ({
        type: SmokerEvent.RunScriptBegin,
        current: scriptIndex * pkgManagerIndex,
        total: totalScripts,
        ...runScriptManifest,
      }),
    ),
    scriptCompleted: enqueueActions(
      ({enqueue, context: {totalScripts}}, {output}: {output: SRMOutput}) => {
        switch (output.type) {
          case 'RESULT': {
            const {result, manifest} = output;
            let evt:
              | PMCtrlExternalRunScriptFailedEvent
              | PMCtrlExternalRunScriptOkEvent
              | PMCtrlExternalRunScriptSkippedEvent;
            if (result.error) {
              evt = {
                type: SmokerEvent.RunScriptFailed,
                ...manifest,
                total: totalScripts!,
                current: 0,
                error: result.error,
              };
            } else if (result.skipped) {
              evt = {
                type: SmokerEvent.RunScriptSkipped,
                ...manifest,
                total: totalScripts!,
                current: 0,
                skipped: true,
              };
            } else {
              evt = {
                type: SmokerEvent.RunScriptOk,
                ...manifest,
                total: totalScripts!,
                current: 0,
                rawResult: result.rawResult!,
              };
            }
            enqueue.emit(evt);
            break;
          }
          case 'ERROR': {
            // XXX: https://github.com/statelyai/xstate/issues/4820
            enqueue.assign({
              error: output.error,
            });
            break;
          }
          case 'BAILED': {
            // idk
            break;
          }
        }
      },
    ),
    spawnPkgManagerLoader: assign({
      loader: ({
        context: {
          cwd,
          defaultExecutor,
          systemExecutor,
          pluginRegistry,
          desiredPkgManagers,
          fm,
        },
        spawn,
      }) => {
        const actor = spawn('pkgManagerLoader', {
          input: {
            cwd,
            pluginRegistry,
            desiredPkgManagers,
            defaultExecutor,
            systemExecutor,
            fm,
          },
          id: 'pkgManagerLoader',
        });
        // https://github.com/statelyai/xstate/issues/4634
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = Debug('pkgManagerLoader');
        return actor;
      },
    }),
    assignPkgManagers: assign({
      pkgManagers: ({context}, {pkgManagers}: {pkgManagers?: PkgManager[]}) =>
        pkgManagers ?? context.pkgManagers,
    }),
    spawnPkgManagerMachines: assign({
      pkgManagerMachines: ({context: {pkgManagers}, spawn}) => {
        const machines = new Map<
          string,
          ActorRefFrom<typeof pkgManagerMachine>
        >();
        pkgManagers.forEach((pkgManager, index) => {
          const id = `pkgManager.${makeId()}`;
          const actor = spawn('pkgManager', {
            id,
            input: {pkgManager, index: index + 1},
          });
          // @ts-expect-error private field
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          actor.logger = actor._actorScope.logger = Debug(id);
          machines.set(pkgManager.id, actor);
        });
        return machines;
      },
    }),
    stopPkgManagerLoader: enqueueActions(({enqueue}) => {
      enqueue.stopChild('pkgManagerLoader');
      enqueue.assign({loader: undefined});
    }),
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QAUDWUCyBDAdlmATgMID2OALgSQDYDEAHrOVuWAHQRntYDG5JBNgAd02PITYAqANoAGALqJQQkrACW5NWSUh6iAKwB2ADQgAnogCcANjayATAGYALI9kBGZ4dnPLLgL7+pmiYuPhgxGSUNLQyCjoq6praSLqIABzWjmyO+u76ls55rs7W9qYWCO72rmyW9paG7j6y1s3pgcGiYYSkFFTUbLBg5ACuQrScOOxMLOwhYuGR-TRDI+NyiqmJGlo4OnpVjobOOQXOpY7px43uFYiOLmwnlpb6V-YF+unphp0gCx6ET60UGwzGQjY1BIWAgahwUAYs1YHC4bF4-EEIlC4giABkYRAIpsEqpdilQIdjtlDNZ9GVLLJ9EYmqV7ghjqd3G5uVd0nl6UZ-oDcctQWsIWwAG5YahqCAseGIknbMnJfapQ7XfTPWSOdyGdLOT7OBx3cwPezuNheOn5QxNblCoIA7qikEDCXjaWy+WKhG0aTuLbKNV7A4ZXK6-WG436U1W9mua2NOl601vIoXYVupYe1YAdwEqCVtGQAEEiABpACiABEVaGkuHNYh3IVrR9MrJ0vZZPU9eynLZHH37NZM98GvYczi81FPUWCCWAwBJAByAGUACrlvF4+uNkA7dURqp+WTPY32BqM-Lc9Ls9zcuqeDxlPL9hyWWeLXoLwti1LI8TxbSlEGsEwLQQH5rQKLJqnpU1+R-F0RXnFZBgIMBYTMWgACUAFV1wAfU3Ih8NXZBt03ECwwpNIEAuSw2CcVw2keRl0nbdl+VsNpGjyRk6UsTJfyBMVPQIUYcBwJVNx4Ag1CEchYAI8tSPIyjqLo5sGMOdt7EMNhuXsI08mfekynZB1L1tfQmROYce3E90AKwmS5IRBSlJUtTdPJDVwIQSCn2qYzjUaHxHnyRzAhdHASCJeBUnQ-9MNJPSgsYgBaSx2Ry2xZGKkrSpK-lXIw8VwXGTLArPRx8ug9xrjqWl43cSDvnCv40NzdLqvWSFoVhJU6tPVsYKgyormMtxRPHPx7zeSqBs9GrIRlOUFU0BFxrAximkvaxTREpkPE4pMnDYdJ+2uDxwtyfRVuBdyvUhCIqGwiB9v0tsfDgw1OtNdMBXZfV0htdq3FKZlnE8RwXsk1YNqhQlIF+7KDIBtgjG4k7ipcMHoJuKGTssapGTyX4kfzQYlxXKBMbPTre1x0oloKbiLnBrJnnHfQbyNJlrA6Pq5zW1ZsNw5nJoaS8BayBz+WaQxHGsXj6RyS5x24gczNpt7pNk+TFOU1TZeCtodSaX5vl8PVLug35rUitpDCM58ahncW-1ezC2E+gQMdVLKWdJ3JCkua5DFuXjXdeRpfFcD3Hl6roJf98UpjAS3GPHYzPmK59PD8C42WantjPqGwfi8Vp6kR+KgA
   */
  id: 'PkgManagerControl',
  context: ({
    input: {
      pluginRegistry,
      desiredPkgManagers,
      defaultExecutorId = DEFAULT_EXECUTOR_ID,
      systemExecutorId = SYSTEM_EXECUTOR_ID,
      cwd = process.cwd(),
      fileManagerOpts,
      linger = false,
    },
  }) => ({
    defaultExecutor: pluginRegistry.getExecutor(defaultExecutorId),
    systemExecutor: pluginRegistry.getExecutor(systemExecutorId),
    desiredPkgManagers,
    pluginRegistry,
    cwd,
    fm: new FileManager(fileManagerOpts),
    linger,
    pkgManagers: [],
    pkgManagerMachines: new Map(),
    needsRunning: -1,
  }),
  initial: 'setup',
  on: {
    '*': {
      actions: [{type: 'eventLogger'}],
    },
    'xstate.done.actor.pkgManager.*': {
      actions: [
        {
          type: 'assignError',
          params: ({event: {output}}) => ({error: output.error}),
        },
      ],
    },
  },
  states: {
    setup: {
      entry: [log('setting up...')],
      initial: 'loading',
      states: {
        loading: {
          entry: [
            log('loading package managers...'),
            {type: 'spawnPkgManagerLoader'},
          ],
          initial: 'loaderWorking',
          states: {
            loaderWorking: {
              entry: [log('waiting for loader...')],
              on: {
                'xstate.done.actor.pkgManagerLoader': [
                  {
                    guard: {
                      type: 'loadedOk',
                      params: ({event: {output}}) => output,
                    },
                    actions: [
                      {
                        type: 'assignPkgManagers',
                        params: ({event: {output}}) =>
                          output.type === 'OK' ? output : {},
                      },
                    ],
                    target: 'loadComplete',
                  },
                  {
                    guard: {
                      type: 'hasLoadError',
                      params: ({event: {output}}) => output,
                    },
                    actions: [
                      {
                        type: 'assignError',
                        params: ({event: {output}}) =>
                          output.type === 'ERROR' ? {error: output.error} : {},
                      },
                    ],
                    target: 'loadErrored',
                  },
                ],
              },
              exit: [{type: 'stopPkgManagerLoader'}],
            },
            loadComplete: {
              entry: [log('load ok')],
              type: 'final',
            },
            loadErrored: {
              entry: [log('load errored')],
              type: 'final',
            },
          },
          onDone: [
            {target: 'loaded', guard: {type: 'notHasError'}},
            {target: 'errored', guard: {type: 'hasError'}},
          ],
        },
        errored: {
          entry: [log('errored out!')],
          type: 'final',
        },
        loaded: {
          guard: [{type: 'hasPkgManagers'}],
          entry: [
            {type: 'spawnPkgManagerMachines'},
            log(
              ({context}) =>
                `spawned ${context.pkgManagers.length} pkgManager machines`,
            ),
          ],
          type: 'final',
        },
      },
      onDone: {
        target: 'preparation',
        actions: [log('done setting up')],
      },
    },
    preparation: {
      on: {
        // XXX need per-pkg-manager pack and install events
        // XXX need higher-level events for both
        // PACKED: {
        //   description: 'For re-emitting',
        //   actions: [
        //     emit(({event: {installManifests}}) => ({
        //       type: SmokerEvent.PackOk,
        //       installManifests,
        //     })),
        //   ],
        // },
        // INSTALLED: {
        //   description: 'For re-emitting',
        //   actions: [
        //     emit(({event: {installResult}}) => ({
        //       type: SmokerEvent.InstallOk,
        //       installResult,
        //     })),
        //   ],
        // },
      },
      always: {
        target: 'ready',
        guard: {type: 'preparationComplete'},
        actions: [log('all pkg manager machines in ready state')],
      },
    },
    ready: {
      entry: [{type: 'assignNeedsRunning'}],
      on: {
        RUN_SCRIPTS: {
          actions: [
            {
              type: 'scriptsBegin',
              params: ({event: {scripts}}) => ({scripts}),
            },
          ],
          target: 'runningScripts',
        },
      },
    },
    runningScripts: {
      entry: [log('running scripts...')],
      on: {
        WILL_RUN_SCRIPT: {
          actions: [{type: 'scriptBegin', params: ({event}) => event}],
        },
        DID_RUN_SCRIPT: {
          actions: [
            {type: 'decrementNeedsRunning'},
            {type: 'scriptCompleted', params: ({event}) => event},
          ],
        },
      },
      always: {
        target: 'done',
        guard: 'runScriptsComplete',
      },
    },
    errored: {
      entry: [log('error!'), 'stopPkgManagerMachines'],
      type: 'final',
    },
    done: {
      entry: [log('ok'), 'stopPkgManagerMachines'],
      type: 'final',
    },
  },
  output: ({context: {error}}) => ({error}),
});
