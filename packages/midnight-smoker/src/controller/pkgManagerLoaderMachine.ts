import {type SomePkgManager} from '#pkg-manager';
import {type PluginRegistry} from '#plugin';
import {type Executor, type PkgManagerOpts} from '#schema';
import {type FileManager} from '#util';
import Debug from 'debug';
import {
  assign,
  enqueueActions,
  log,
  not,
  sendParent,
  setup,
  type ActorRefFrom,
} from 'xstate';
import {makeId} from './pkgManagerControlMachine';
import {pkgManagerPluginLoaderMachine} from './pkgManagerPluginLoaderMachine';

export interface PMLMInput {
  cwd: string;
  fm: FileManager;
  pluginRegistry: PluginRegistry;
  desiredPkgManagers: string[];
  defaultExecutor: Executor;
  systemExecutor: Executor;
  opts?: PkgManagerOpts;
}

export interface PMLMContext extends PMLMInput {
  pluginLoaders: Map<
    string,
    ActorRefFrom<typeof pkgManagerPluginLoaderMachine>
  >;
  pkgManagers: SomePkgManager[];
}

export interface PMLMEventPluginsLoaded {
  type: 'PLUGINS_LOADED';
  sender: string;
  pkgManagers: SomePkgManager[];
}

export type PMLMEvents = PMLMEventPluginsLoaded;

export type PMLMOutput = SomePkgManager[];

export const pkgManagerLoaderMachine = setup({
  types: {
    input: {} as PMLMInput,
    context: {} as PMLMContext,
    events: {} as PMLMEvents,
    output: {} as PMLMOutput,
  },
  actors: {
    pkgManagerPluginLoader: pkgManagerPluginLoaderMachine,
  },
  guards: {
    hasPluginLoaders: ({context: {pluginLoaders}}) => pluginLoaders.size > 0,
    hasPkgManagers: ({context: {pkgManagers}}) => pkgManagers.length > 0,
  },
  actions: {
    eventLogger: log(({event}) => `received evt ${event.type}`),
    entryLogger: log(({self}) => `PkgManagerLoader ${self.id} online`),
    spawnPluginLoaders: assign({
      pluginLoaders: ({
        context: {
          pluginRegistry,
          cwd,
          desiredPkgManagers,
          fm,
          systemExecutor,
          defaultExecutor,
          opts,
        },
        spawn,
      }) => {
        const machines = new Map<
          string,
          ActorRefFrom<typeof pkgManagerPluginLoaderMachine>
        >();
        for (const plugin of pluginRegistry.plugins) {
          const id = `pkgManagerPluginLoader-${makeId()}`;
          const actor = spawn('pkgManagerPluginLoader', {
            id,
            input: {
              plugin,
              pluginRegistry,
              fm,
              cwd,
              desiredPkgManagers,
              systemExecutor,
              defaultExecutor,
              opts,
            },
          });
          // https://github.com/statelyai/xstate/issues/4634
          // @ts-expect-error private
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          actor.logger = actor._actorScope.logger = Debug(id);
          machines.set(actor.id, actor);
        }
        return machines;
      },
    }),
    stopPluginLoaders: enqueueActions(({enqueue, context: {pluginLoaders}}) => {
      for (const machine of pluginLoaders.values()) {
        enqueue.stopChild(machine);
        log(`stopped ${machine.id}`);
      }
      enqueue.assign({pluginLoaders: new Map()});
    }),
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QAUDWUCyBDAdlmATgDID2WEYBAxAFQDaADALqKgAOJsAlgC5ck5WIAB6IALAHYATADoAnHKkBGABwSArABoQAT0RKpAX0Pa0mXPkqlylGQBsyELjijI7AVyjPYVZEQCqAOIAkgByAMoA+kQA8gCCACIAogmMLEggHNx8AkKiCADMDAzy6gUGWrqIUgVyMtIAbOoNUurGpujYeITWFAQyAG5YdlwQWHwuVGlCWbz8ghn5LbJqlXoIUg1i9QzlrcYmIDgkFPAZZl2WxI6UM5xzuYuIALRK2utySqV7bYcXFj0bv0HORnK4PF4cGd2PccgtQPlJO9qpsZGIyhV2iB-t0rEDBsNRuMwXdsvM8uI5BIZCoKsiNi1vpi-p0AXibP0IAIwKSHvCRIgVAwGjSxAUNPSaioZFJdszjEA
   */
  context: ({input}) => ({
    ...input,
    pluginLoaders: new Map(),
    pkgManagers: [],
  }),
  on: {
    '*': {
      actions: ['eventLogger'],
    },
  },
  entry: [
    'entryLogger',
    'spawnPluginLoaders',
    log(({context}) => `spawned ${context.pluginLoaders.size} plugin loaders`),
  ],
  id: 'PkgManagerLoader',
  initial: 'loadingPlugins',
  states: {
    loadingPlugins: {
      on: {
        PLUGINS_LOADED: {
          guard: not('hasPkgManagers'),
          actions: [
            assign({
              pkgManagers: ({event, context}) => [
                ...context.pkgManagers,
                ...event.pkgManagers,
              ],
            }),
          ],
          target: 'validating',
        },
      },
    },
    validating: {
      always: {
        guard: 'hasPkgManagers',
        target: 'done',
      },
    },
    done: {
      entry: [
        'stopPluginLoaders',
        sendParent(({context: {pkgManagers}}) => ({
          type: 'LOADED',
          pkgManagers,
        })),
      ],
      type: 'final',
    },
  },
  output: ({context: {pkgManagers}}) => pkgManagers,
});
