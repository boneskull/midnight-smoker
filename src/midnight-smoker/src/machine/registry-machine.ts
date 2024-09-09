import {type LoaderCapabilities} from '#capabilities';
import {ERROR, FINAL, OK} from '#constants';
import {DuplicatePluginError} from '#error/duplicate-plugin-error';
import {MachineError} from '#error/machine-error';
import {PluginConflictError} from '#error/plugin-conflict-error';
import {
  registerPluginLogic,
  type RegisterPluginLogicOutput,
  type RegisterPluginLogicOutputError,
  type RegisterPluginLogicOutputOk,
} from '#machine/actor/register-plugin';
import {
  resolvePluginLogic,
  type ResolvePluginLogicOutputError,
  type ResolvePluginLogicOutputOk,
} from '#machine/actor/resolve-plugin';
import {
  type ActorOutputError,
  type ActorOutputOk,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
} from '#machine/util';
import {type ComponentRegistry} from '#plugin/component';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type Plugin} from '#schema/plugin';
import * as assert from '#util/assert';
import {fromUnknownError} from '#util/error-util';
import {FileManager} from '#util/filemanager';
import {isActorOutputNotOk, isActorOutputOk} from '#util/guard/actor-output';
import {type SomeUniqueId, uniqueId} from '#util/unique-id';
import {castArray} from '#util/util';
import {isEmpty} from 'lodash';
import {type ValueOf} from 'type-fest';
import {
  and,
  assign,
  emit,
  enqueueActions,
  log,
  not,
  raise,
  setup,
} from 'xstate';

import type * as Event from './event/registry.js';

import {type AbortEvent} from './event/abort.js';

/**
 * A function that determines if a plugin is "blessed".
 *
 * A "blessed" plugin's component identifiers are not prefixed with the
 * namespace of the plugin ID.
 */
export type IsBlessedPluginFn = (pluginId: string) => boolean;

/**
 * Events emitted by a {@link RegistryMachine}
 */
export type RegistryMachineEmitted = Event.RegistryMachineRegisteredEvent;

/**
 * Events that can be sent to a {@link RegistryMachine}
 */
export type RegistryMachineEvent =
  | AbortEvent
  | Event.RegistryMachineCloseEvent
  | Event.RegistryMachineRegisterDoneEvent
  | Event.RegistryMachineRegisterErrorEvent
  | Event.RegistryMachineRegisterPluginEvent
  | Event.RegistryMachineRegisterPluginsEvent
  | Event.RegistryMachineResolveDoneEvent
  | Event.RegistryMachineResolveErrorEvent;

/**
 * Output of a {@link RegistryMachine}
 */
export type RegistryMachineOutput =
  | RegistryMachineOutputError
  | RegistryMachineOutputOk;

/**
 * Output of a {@link RegistryMachine} when an error occurs
 */
export type RegistryMachineOutputError = ActorOutputError<
  MachineError,
  {aborted?: boolean}
>;

/**
 * Output of a {@link RegistryMachine} when all is well
 */
export type RegistryMachineOutputOk = ActorOutputOk<{
  componentRegistry: ComponentRegistry;
  pluginMap: Map<string, Readonly<PluginMetadata>>;
}>;

/**
 * Parameters for the `resolvePlugin` action
 */
type ResolvePluginActionParams = {
  id: SomeUniqueId;
  pluginIds: readonly string[] | string;
};

/**
 * Context of a {@link RegistryMachine}
 */
export interface RegistryMachineContext extends RegistryMachineInput {
  /**
   * Whether the machine has been aborted
   */
  aborted?: boolean;
  closing: boolean;
  componentRegistry: ComponentRegistry;
  cwd: string;
  error?: MachineError;
  fileManager: FileManager;
  inFlight: Record<
    SomeUniqueId,
    {complete: Readonly<PluginMetadata>[]; count: number}
  >;
  isBlessedPlugin: IsBlessedPluginFn;
  knownPluginMetadata: WeakSet<Readonly<PluginMetadata>>;

  /**
   * Map of plugin ID to metadata
   */
  pluginIdToMetadataMap: Map<string, Readonly<PluginMetadata>>;

  /**
   * Lookup of actual plugin objects to plugin id
   */
  pluginToPluginIdMap: WeakMap<Plugin, string>;
  registrations: Record<SomeUniqueId, Readonly<PluginMetadata>[]>;
}

export interface RegistryMachineInput {
  cwd?: string;
  fileManager?: FileManager;
  isBlessedPlugin?: IsBlessedPluginFn;
  loader?: LoaderCapabilities;
}

/**
 * @internal
 */
export const RegistryMachine = setup({
  actions: {
    abort: raise({type: 'ABORT'}),
    aborted: assign({aborted: true}),

    /**
     * Updates ALL THE DATA STRUCTURES with the new plugin and its metadata.
     */
    addPlugin: assign({
      componentRegistry: (
        {context: {componentRegistry}},
        {newComponents}: RegisterPluginLogicOutputOk,
      ) => {
        // WeakMap; must mutate
        for (const [componentObject, component] of newComponents) {
          componentRegistry.set(componentObject, component);
        }
        return componentRegistry;
      },

      /**
       * Update the `complete` field of the flight data
       */
      inFlight: ({context: {inFlight, registrations}}, {id, metadata}) => {
        assert.ok(!(id in registrations));
        const flightData: ValueOf<typeof inFlight> = {
          ...inFlight[id],
          complete: [...inFlight[id].complete, metadata],
        };
        return {
          ...inFlight,
          [id]: flightData,
        };
      },
      knownPluginMetadata: (
        {context: {knownPluginMetadata}},
        {metadata}: RegisterPluginLogicOutputOk,
      ) => {
        // WeakSet; must mutate
        knownPluginMetadata.add(metadata);
        return knownPluginMetadata;
      },
      pluginIdToMetadataMap: (
        {context: {pluginIdToMetadataMap: pluginMap}},
        {metadata}: RegisterPluginLogicOutputOk,
      ) => new Map([...pluginMap, [metadata.id, metadata]]),

      pluginToPluginIdMap: (
        {context: {pluginToPluginIdMap: knownPlugins}},
        {metadata, plugin}: RegisterPluginLogicOutputOk,
      ) => {
        // WeakMap; must mutate
        knownPlugins.set(plugin, metadata.id);
        return knownPlugins;
      },
    }),

    assignError: assign({
      error: ({context, self}, {error: err}: {error: unknown}) => {
        const error = fromUnknownError(err);
        if (context.error) {
          return context.error.cloneWith(error);
        }

        return new MachineError(
          `Plugin registrar encountered an error: ${error.message}`,
          error,
          self.id,
        );
      },
    }),

    completeRegistration: enqueueActions(
      (
        {context: {registrations}, enqueue},
        {id, plugins}: {id: SomeUniqueId; plugins: Readonly<PluginMetadata>[]},
      ) => {
        const newRegistrations: typeof registrations = {
          ...registrations,
          [id]: plugins,
        };
        enqueue.assign({
          registrations: newRegistrations,
        });
      },
    ),
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),
    registerPlugin: enqueueActions(
      (
        {context: {componentRegistry, isBlessedPlugin}, enqueue},
        {id, metadata, plugin}: Event.RegisterPluginActionParams,
      ) => {
        const actorId = uniqueId({
          prefix: 'registerPlugin',
          suffix: metadata.id,
        });
        enqueue.spawnChild('registerPlugin', {
          id: actorId,
          input: {
            componentRegistry,
            id,
            isBlessedPlugin,
            metadata,
            plugin,
          },
        });
      },
    ),
    resolvePlugin: enqueueActions(
      (
        {context: {cwd, fileManager, loader}, enqueue},
        {id, pluginIds}: ResolvePluginActionParams,
      ) => {
        const desiredPluginIds = castArray(pluginIds);
        for (const moduleId of desiredPluginIds) {
          const actorId = uniqueId({
            prefix: 'resolvePlugin',
            suffix: moduleId,
          });
          enqueue.spawnChild('resolvePlugin', {
            id: actorId,
            input: {
              cwd,
              fileManager,
              id,
              loader,
              moduleId,
            },
          });
        }
      },
    ),
    startFlight: assign({
      inFlight: (
        {context: {inFlight}},
        {
          id,
          pluginIds,
        }: {id: SomeUniqueId; pluginIds: readonly string[] | string[]},
      ) => {
        return {
          ...inFlight,
          [id]: {
            complete: [],
            count: pluginIds.length,
          },
        };
      },
    }),
    stopFlight: assign({
      inFlight: ({context: {inFlight}}, id: SomeUniqueId) => {
        const {[id]: _, ...rest} = inFlight;
        return rest;
      },
    }),
    updateRegistrations: enqueueActions(
      ({context: {inFlight}, enqueue}, id: SomeUniqueId) => {
        const flightData = inFlight[id];
        assert.ok(flightData);
        const {complete: plugins, count} = flightData;
        // this means that all plugins for the ID have been resolved,
        // and we can add to `registrations`
        if (count === plugins.length) {
          enqueue({
            // @ts-expect-error TS sux
            params: {id, plugins},
            type: 'completeRegistration',
          });
          enqueue({
            // @ts-expect-error TS sux
            params: id,
            type: 'stopFlight',
          });
        }
      },
    ),
  },
  actors: {
    registerPlugin: registerPluginLogic,
    resolvePlugin: resolvePluginLogic,
  },
  guards: {
    canBeginRegistration: (
      {
        context: {
          closing,
          inFlight,
          knownPluginMetadata,
          pluginIdToMetadataMap,
          pluginToPluginIdMap,
          registrations,
        },
      },
      params:
        | {
            id: SomeUniqueId;
            metadata: Readonly<PluginMetadata>;
            plugin?: Plugin;
          }
        | {id: SomeUniqueId; pluginIds: readonly string[]},
    ) => {
      const {id} = params;
      if (closing) {
        return false;
      }
      // avoid accidental repeated registration attempts
      if (id in inFlight || id in registrations) {
        return false;
      }
      if ('metadata' in params) {
        const {metadata, plugin} = params;
        return Boolean(
          (!plugin || !pluginToPluginIdMap.has(plugin)) &&
            !pluginIdToMetadataMap.has(metadata.id) &&
            !knownPluginMetadata.has(metadata),
        );
      }
      const {pluginIds = []} = params;
      return pluginIds.every((id) => !pluginIdToMetadataMap.has(id));
    },
    isAborted: ({context: {aborted}}) => Boolean(aborted),
    isClosing: ({context: {closing}}) => closing,
    isDone: and(['isClosing', ({context: {inFlight}}) => isEmpty(inFlight)]),
    isKnownPlugin: ({context: {pluginToPluginIdMap}}, plugin: Plugin) =>
      pluginToPluginIdMap.has(plugin),
    isKnownPluginId: (
      {context: {pluginIdToMetadataMap}},
      metadata: Readonly<PluginMetadata>,
    ) => pluginIdToMetadataMap.has(metadata.id),
    shouldRegister: (
      {
        context: {
          knownPluginMetadata,
          pluginIdToMetadataMap,
          pluginToPluginIdMap,
        },
      },
      output: RegisterPluginLogicOutput,
    ) => {
      if (isActorOutputOk(output)) {
        const {metadata, plugin} = output;
        return Boolean(
          !pluginToPluginIdMap.has(plugin) &&
            !pluginIdToMetadataMap.has(metadata.id) &&
            !knownPluginMetadata.has(metadata),
        );
      }
      return false;
    },
  },
  types: {
    context: {} as RegistryMachineContext,
    emitted: {} as RegistryMachineEmitted,
    events: {} as RegistryMachineEvent,
    input: {} as RegistryMachineInput,
    output: {} as RegistryMachineOutput,
  },
}).createMachine({
  context: ({
    input: {
      cwd = process.cwd(),
      fileManager = FileManager.create(),
      isBlessedPlugin = () => false,
      loader,
    },
  }): RegistryMachineContext => ({
    closing: false,
    componentRegistry: new WeakMap(),
    cwd,
    fileManager,
    inFlight: {},
    isBlessedPlugin,
    knownPluginMetadata: new WeakSet(),
    loader,
    pluginIdToMetadataMap: new Map(),
    pluginToPluginIdMap: new WeakMap(),
    registrations: {},
  }),
  entry: [INIT_ACTION],
  id: 'RegistryMachine',
  initial: 'open',
  on: {
    ABORT: [
      {
        actions: [
          log(({event}) => {
            let msg = '🚨 ABORTING!';
            if (event.reason) {
              msg += ` Reason: ${event.reason}`;
            }
            return msg;
          }),
          enqueueActions(({enqueue, self}) => {
            const {children = {}} = self.getSnapshot();
            for (const id of Object.keys(children)) {
              enqueue.stopChild(id);
            }
          }),
          'aborted',
        ],
        guard: not('isAborted'),
        target: '.closed',
      },
      {
        actions: [log(`🚨 Aborted again? We're doing the best we can.`)],
        guard: 'isAborted',
      },
    ],
  },
  output: ({
    context: {
      aborted,
      componentRegistry,
      error,
      pluginIdToMetadataMap: pluginMap,
    },
    self: {id: actorId},
  }) =>
    error
      ? {
          aborted,
          actorId,
          error,
          type: ERROR,
        }
      : {
          actorId,
          componentRegistry,
          pluginMap,
          type: OK,
        },
  states: {
    closed: {
      entry: log('🔴 Registry closed'),
      type: FINAL,
    },
    open: {
      always: {guard: 'isDone', target: 'closed'},
      entry: log('🟢 Registry open'),
      exit: [assign({closing: false})],
      on: {
        CLOSE: [
          {
            actions: [
              assign({
                closing: true,
              }),
              log('🟡 Closing registry; new registrations are disallowed'),
            ],
            guard: not('isClosing'),
          },
          {
            actions: [
              log(
                '⚠️ Warning: received CLOSE event while registry already closing',
              ),
            ],
          },
        ],
        REGISTER_PLUGIN: [
          {
            actions: [
              log(({event}) => `Registering plugin: ${event.metadata.id}`),
              {
                params: ({event: {id}}) => ({id, pluginIds: [id]}),
                type: 'startFlight',
              },
              {
                params: ({event}) => event,
                type: 'registerPlugin',
              },
            ],
            guard: {
              params: ({event}) => event,
              type: 'canBeginRegistration',
            },
          },
          {
            actions: [
              log(
                ({event}) =>
                  `Plugin with name "${event.metadata.id}" already registered`,
              ),
              {
                params: ({
                  context: {pluginIdToMetadataMap: pluginMap},
                  event: {metadata},
                }) => {
                  const existing = pluginMap.get(metadata.id)!;
                  return {error: new PluginConflictError(existing, metadata)};
                },
                type: 'assignError',
              },
              'abort',
            ],
            guard: {
              params: ({event}) => event.metadata,
              type: 'isKnownPluginId',
            },
          },
          {
            actions: [
              log(
                ({
                  context: {pluginToPluginIdMap: knownPlugins},
                  event: {metadata, plugin},
                }) =>
                  `Plugin with name "${
                    metadata.id
                  }" already registered under a different name (${knownPlugins.get(
                    plugin,
                  )!})`,
              ),
              {
                params: ({
                  context: {pluginToPluginIdMap: knownPlugins},
                  event: {metadata, plugin},
                }) => ({
                  error: new DuplicatePluginError(
                    metadata.id,
                    knownPlugins.get(plugin)!,
                  ),
                }),
                type: 'assignError',
              },
              'abort',
            ],
            guard: {
              params: ({event}) => event.plugin,
              type: 'isKnownPlugin',
            },
          },
          {
            actions: [
              log(
                ({event: {metadata}}) =>
                  `⚠️ Warning: received REGISTER_PLUGIN event for plugin "${metadata.id}" while closing`,
              ),
            ],
            guard: 'isClosing',
          },
        ],
        REGISTER_PLUGINS: {
          actions: [
            {
              params: ({event: {id, pluginIds}}) => ({id, pluginIds}),
              type: 'startFlight',
            },
            {
              params: ({event}): ResolvePluginActionParams => event,
              type: 'resolvePlugin',
            },
          ],
          guard: {
            params: ({event}) => event,
            type: 'canBeginRegistration',
          },
        },
        'xstate.done.actor.registerPlugin.*': [
          {
            actions: [
              {
                params: ({event: {output}}) =>
                  output as RegisterPluginLogicOutputOk,
                type: 'addPlugin',
              },
              emit(
                ({
                  event: {output},
                  self: {id: sender},
                }): Event.RegistryMachineRegisteredEvent => {
                  const {id, metadata, newComponents} =
                    output as RegisterPluginLogicOutputOk;
                  return {
                    id,
                    metadata,
                    newComponents,
                    sender,
                    type: 'REGISTERED',
                  };
                },
              ),
              {
                params: ({
                  event: {
                    output: {id},
                  },
                }) => id,
                type: 'updateRegistrations',
              },
            ],
            guard: {
              params: ({event: {output}}) => output,
              type: 'shouldRegister',
            },
          },
          {
            actions: [
              {
                params: ({event: {output}}) => ({
                  error: (output as RegisterPluginLogicOutputError).error,
                }),
                type: 'assignError',
              },
              'abort',
            ],
            guard: ({event: {output}}) => isActorOutputNotOk(output),
          },
        ],
        'xstate.done.actor.resolvePlugin.*': [
          {
            actions: {
              params: ({event: {output}}) =>
                output as ResolvePluginLogicOutputOk,
              type: 'registerPlugin',
            },
            guard: ({event: {output}}) => isActorOutputOk(output),
          },
          {
            actions: [
              log(
                ({event: {output}}) =>
                  `Plugin resolution failed: ${
                    (output as ResolvePluginLogicOutputError).error.message
                  }`,
              ),
              {
                params: ({event: {output}}) => ({
                  error: (output as ResolvePluginLogicOutputError).error,
                }),
                type: 'assignError',
              },
              'abort',
            ],
          },
        ],
      },
    },
  },
});
