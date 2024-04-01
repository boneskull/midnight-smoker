import {type InstallManifest} from '#schema/install-manifest';
import Debug from 'debug';
import {type SetRequired} from 'type-fest';
import {
  assign,
  enqueueActions,
  log,
  not,
  setup,
  stopChild,
  type ActorRefFrom,
} from 'xstate';
import {
  type InstallResult,
  type PackOptions,
  type SomePkgManager,
} from '../component';
import {type Executor} from '../component/executor';
import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '../constants';
import {type PluginRegistry} from '../plugin/plugin-registry';
import {FileManager, type FileManagerOpts} from '../util/filemanager';
import {
  pkgManagerLoaderMachine,
  type PMLMOutput,
} from './pkgManagerLoaderMachine';
import {pkgManagerMachine} from './pkgManagerMachine';
import {type SRMOutput} from './scriptRunnerMachine';

export interface PMCtrlMachineInput {
  pluginRegistry: PluginRegistry;
  desiredPkgManagers: string[];
  defaultExecutorId?: string;
  systemExecutorId?: string;
  cwd?: string;
  fileManagerOpts?: FileManagerOpts;
  linger?: boolean;
  packOptions?: PackOptions;
}

type PMCtrlMachineContext = Omit<
  SetRequired<PMCtrlMachineInput, 'cwd' | 'linger'>,
  'defaultExecutorId' | 'systemExecutorId' | 'fileManagerOpts'
> & {
  pkgManagers: SomePkgManager[];
  defaultExecutor: Executor;
  systemExecutor: Executor;
  fm: FileManager;
  pkgManagerMachines: Map<string, ActorRefFrom<typeof pkgManagerMachine>>;
  needsRunning: number;
  scripts?: string[];
  loader?: ActorRefFrom<typeof pkgManagerLoaderMachine>;
  error?: Error;
};

export const makeId = () => Math.random().toString(36).substring(7);
interface PMCtrlPackedEvent {
  type: 'PACKED';
  sender: string;
  installManifests: InstallManifest[];
}

interface PMCtrlInitEvent {
  type: 'INIT';
}

interface PMCtrlPackEvent {
  type: 'PACK';
  opts?: PackOptions;
}

interface PMCtrlLoadedEvent {
  type: 'LOADED';
  pkgManagers: SomePkgManager[];
}

interface PMCtrlInstalledEvent {
  type: 'INSTALLED';
  sender: string;
  installResult: InstallResult;
}

interface PMCtrlRunScriptsEvent {
  type: 'RUN_SCRIPTS';
  scripts: string[];
}

interface PMCtrlRanScriptEvent {
  type: 'RAN_SCRIPT';
  result: SRMOutput;
}

interface PMCtrlPkgManagerLoaderDoneEvent {
  type: 'xstate.done.actor.pkgManagerLoader';
  output: PMLMOutput;
}

interface PMCtrlPkgManagerDoneEvent {
  type: 'xstate.done.actor.pkgManager.*';
  output: {error?: Error};
}

type PMCtrlEvents =
  | PMCtrlInitEvent
  | PMCtrlPackEvent
  | PMCtrlPackedEvent
  | PMCtrlLoadedEvent
  | PMCtrlInstalledEvent
  | PMCtrlRunScriptsEvent
  | PMCtrlPkgManagerLoaderDoneEvent
  | PMCtrlPkgManagerDoneEvent
  | PMCtrlRanScriptEvent;

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
    hasPkgManagerLoader: ({context: {loader}}) => loader !== undefined,
    hasPkgManagers: ({context}) => context.pkgManagers.length > 0,
    hasError: ({context: {error}}) => error !== undefined,
    preprocessingComplete: ({context: {pkgManagerMachines}}) => {
      return [...pkgManagerMachines.values()].every((machine) =>
        machine.getSnapshot().matches('ready'),
      );
    },
    runScriptsComplete: ({context: {needsRunning}}) => needsRunning === 0,
    notHasError: not('hasError'),
  },
  actions: {
    decrementNeedsRunning: assign({
      needsRunning: ({context: {needsRunning}}) => needsRunning - 1,
    }),
    assignNeedsRunning: assign({
      needsRunning: ({context: {pkgManagerMachines}}) =>
        pkgManagerMachines.size,
    }),
    eventLogger: log(({event}) => `received evt ${event.type}`),
    stopPkgManagerMachines: enqueueActions(
      ({enqueue, context: {pkgManagerMachines}}) => {
        for (const machine of pkgManagerMachines.values()) {
          enqueue.stopChild(machine);
        }
        enqueue.assign({pkgManagerMachines: new Map()});
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
    spawnPkgManagerMachines: assign({
      pkgManagerMachines: ({context, spawn}) => {
        const machines = new Map<
          string,
          ActorRefFrom<typeof pkgManagerMachine>
        >();
        for (const pkgManager of context.pkgManagers) {
          const id = `pkgManager.${makeId()}`;
          const actor = spawn('pkgManager', {
            id,
            input: {pkgManager},
          });
          // @ts-expect-error private field
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          actor.logger = actor._actorScope.logger = Debug(id);
          machines.set(pkgManager.id, actor);
        }
        return machines;
      },
    }),
    stopPkgManagerLoader: stopChild('pkgManagerLoader'),
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
      actions: ['eventLogger'],
    },
    'xstate.done.actor.pkgManager.*': {
      actions: [
        assign({
          error: ({
            event: {
              output: {error},
            },
          }) => error,
        }),
      ],
    },
  },
  states: {
    setup: {
      entry: log('setting up...'),
      initial: 'loading',
      states: {
        loading: {
          entry: [log('loading package managers...'), 'spawnPkgManagerLoader'],
          on: {
            'xstate.done.actor.pkgManagerLoader': {
              actions: [
                enqueueActions(({enqueue, event: {output}, context}) => {
                  if ('pkgManagers' in output) {
                    enqueue.assign({
                      pkgManagers: [
                        ...context.pkgManagers,
                        ...output.pkgManagers,
                      ],
                    });
                  } else if ('error' in output) {
                    enqueue.assign({error: output.error});
                  } else {
                    enqueue.assign({
                      error: new Error(
                        `Invalid pkgManagerLoader output: ${JSON.stringify(
                          output,
                        )}`,
                      ),
                    });
                  }
                }),
                assign({
                  loader: undefined,
                }),
                'stopPkgManagerLoader',
              ],
              target: 'validating',
            },
          },
        },
        validating: {
          always: [
            {guard: 'hasError', target: 'errored'},
            {guard: 'notHasError', target: 'loaded'},
          ],
        },
        errored: {
          type: 'final',
        },
        loaded: {
          guard: 'hasPkgManagers',
          entry: [
            'spawnPkgManagerMachines',
            log(
              ({context}) =>
                `spawned ${context.pkgManagers.length} pkgManager machines`,
            ),
          ],
          type: 'final',
        },
      },
      onDone: {
        target: 'working',
        actions: [log('done setting up')],
      },
    },
    working: {
      on: {
        PACKED: {
          description: 'For re-emitting',
          actions: [log(({event: {sender}}) => `packed: ${sender}`)],
        },
        INSTALLED: {
          description: 'For re-emitting',
          actions: [log(({event: {sender}}) => `installed: ${sender}`)],
        },
      },
      always: {
        target: 'ready',
        guard: 'preprocessingComplete',
        actions: [log('all pkg manager machines in ready state')],
      },
    },
    ready: {
      entry: ['assignNeedsRunning'],
      on: {
        RUN_SCRIPTS: {
          actions: [
            enqueueActions(
              ({enqueue, context: {pkgManagerMachines}, event: {scripts}}) => {
                for (const machine of pkgManagerMachines.values()) {
                  enqueue.sendTo(machine, {type: 'RUN_SCRIPTS', scripts});
                }
              },
            ),
          ],
          target: 'runningScripts',
        },
      },
    },
    runningScripts: {
      entry: [log('running scripts...')],
      on: {
        RAN_SCRIPT: {
          actions: ['decrementNeedsRunning'],
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
