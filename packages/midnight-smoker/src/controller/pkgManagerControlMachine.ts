import {type InstallManifest} from '#schema/install-manifest';
import Debug from 'debug';
import {type SetRequired} from 'type-fest';
import {assign, enqueueActions, log, setup, type ActorRefFrom} from 'xstate';
import {
  type InstallResult,
  type PackOptions,
  type SomePkgManager,
} from '../component';
import {type Executor} from '../component/executor';
import {DEFAULT_EXECUTOR_ID, SYSTEM_EXECUTOR_ID} from '../constants';
import {type PluginRegistry} from '../plugin/plugin-registry';
import {FileManager, type FileManagerOpts} from '../util/filemanager';
import {pkgManagerLoaderMachine} from './pkgManagerLoaderMachine';
import {pkgManagerMachine} from './pkgManagerMachine';

interface PMCtrlMachineInput {
  pluginRegistry: PluginRegistry;
  desiredPkgManagers: string[];
  defaultExecutorId?: string;
  systemExecutorId?: string;
  cwd?: string;
  fileManagerOpts?: FileManagerOpts;
  linger?: boolean;
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
  needsPacking: number;
  needsInstalling: number;
  scripts?: string[];
  loader?: ActorRefFrom<typeof pkgManagerLoaderMachine>;
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

type PMCtrlEvents =
  | PMCtrlInitEvent
  | PMCtrlPackEvent
  | PMCtrlPackedEvent
  | PMCtrlLoadedEvent
  | PMCtrlInstalledEvent
  | PMCtrlRunScriptsEvent;

export const pkgManagerControlMachine = setup({
  types: {
    context: {} as PMCtrlMachineContext,
    events: {} as PMCtrlEvents,
    input: {} as PMCtrlMachineInput,
  },
  actors: {
    pkgManager: pkgManagerMachine,
    pkgManagerLoader: pkgManagerLoaderMachine,
  },
  guards: {
    hasPkgManagers: ({context}) => context.pkgManagers.length > 0,
    preprocessingComplete: ({context: {needsPacking, needsInstalling}}) => {
      return needsPacking === 0 && needsInstalling === 0;
    },
  },
  actions: {
    eventLogger: log(({event}) => `received evt ${event.type}`),
    spawnPkgManagers: assign({
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
  },
}).createMachine({
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
    needsPacking: -1,
    needsInstalling: -1,
  }),
  initial: 'idle',
  on: {
    '*': {
      actions: ['eventLogger'],
    },
  },
  states: {
    idle: {
      on: {
        INIT: {
          target: 'loading',
        },
      },
    },
    loading: {
      entry: [
        log('initializing'),
        assign({
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
      ],
      on: {
        LOADED: {
          actions: [
            assign({
              pkgManagers: ({event: {pkgManagers}}) => pkgManagers,
            }),
            enqueueActions(({enqueue, context: {loader}}) => {
              if (loader) {
                enqueue.stopChild(loader);
                enqueue.assign({loader: undefined});
              }
            }),
          ],
          target: 'loaded',
        },
      },
    },
    loaded: {
      guard: 'hasPkgManagers',
      entry: [
        'spawnPkgManagers',
        log(
          ({context}) =>
            `spawned ${context.pkgManagers.length} pkgManager machines`,
        ),
      ],
      on: {
        PACK: {
          target: 'preprocessing',
          actions: [
            log('got PACK'),
            enqueueActions(
              ({enqueue, context: {pkgManagerMachines}, event}) => {
                const pkgManagerCount = pkgManagerMachines.size;
                enqueue.assign({
                  needsPacking: pkgManagerCount,
                  needsInstalling: pkgManagerCount,
                });
                for (const machine of pkgManagerMachines.values()) {
                  enqueue.sendTo(machine, {type: 'PACK', opts: event.opts});
                }
              },
            ),
          ],
        },
      },
    },
    preprocessing: {
      on: {
        PACKED: {
          actions: [
            log('received PACKED'),
            assign({
              needsPacking: ({context: {needsPacking}}) => needsPacking - 1,
            }),
            ({context: {needsPacking}, event}) => {
              log(`packed: ${event.sender}; ${needsPacking} remain`);
            },
          ],
        },
        INSTALLED: {
          actions: [
            log('received INSTALLED'),
            assign({
              needsInstalling: ({context: {needsInstalling}}) =>
                needsInstalling - 1,
            }),
            ({context: {needsInstalling}, event}) => {
              log(`installed: ${event.sender}; ${needsInstalling} remain`);
            },
          ],
        },
      },
      always: {
        target: 'ready',
        guard: 'preprocessingComplete',
      },
    },
    ready: {
      on: {
        RUN_SCRIPTS: {
          actions: [
            log('got RUN_SCRIPTS'),
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
      entry: log('running scripts...'),
    },
    done: {
      type: 'final',
      entry: [
        log('ctrl done'),
        enqueueActions(({enqueue, context: {pkgManagerMachines}}) => {
          for (const machine of pkgManagerMachines.values()) {
            enqueue.stopChild(machine);
            log(`stopped ${machine.id}`);
          }
          enqueue.assign({pkgManagerMachines: new Map()});
        }),
      ],
    },
  },
});
