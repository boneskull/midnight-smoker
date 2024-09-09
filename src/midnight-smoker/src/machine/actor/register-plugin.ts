import type {
  Component,
  ComponentObject,
  ComponentRegistry,
  ComponentRegistryEntries,
  SomeComponentObject,
} from '#plugin/component';
import type {Plugin} from '#schema/plugin';

import {type ComponentKind, DEFAULT_COMPONENT_ID, ERROR, OK} from '#constants';
import {ComponentCollisionError} from '#error/component-collision-error';
import {PluginInitError} from '#error/plugin-init-error';
import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {
  createPluginAPI,
  type RegisterComponentFn,
} from '#plugin/create-plugin-api';
import {PluginMetadata} from '#plugin/plugin-metadata';
import {serialize} from '#util/serialize';
import {type SomeUniqueId} from '#util/unique-id';
import {type Except} from 'type-fest';
import {fromPromise} from 'xstate';

export type RegisterPluginLogicInput = {
  /**
   * Read-only component registry!
   */
  componentRegistry: Except<ComponentRegistry, 'delete' | 'set'>;
  id: SomeUniqueId;
  isBlessedPlugin?: (pluginId: string) => boolean;
  metadata: Readonly<PluginMetadata>;
  plugin: Plugin;
};

export type RegisterPluginLogicOutputOk = ActorOutputOk<
  {
    newComponents: ComponentRegistryEntries;
  } & Pick<RegisterPluginLogicInput, 'id' | 'metadata' | 'plugin'>
>;

export type RegisterPluginLogicOutputError = ActorOutputError<
  ComponentCollisionError | PluginInitError,
  {
    newComponents: ComponentRegistryEntries;
  } & Pick<RegisterPluginLogicInput, 'id' | 'metadata' | 'plugin'>
>;

export type RegisterPluginLogicOutput =
  | RegisterPluginLogicOutputError
  | RegisterPluginLogicOutputOk;

function getComponentId(
  pluginName: string,
  componentName: string,
  isBlessed = false,
): string {
  return isBlessed ? componentName : `${pluginName}/${componentName}`;
}

export const registerPluginLogic = fromPromise<
  RegisterPluginLogicOutput,
  RegisterPluginLogicInput
>(
  async ({
    input: {
      componentRegistry,
      id,
      isBlessedPlugin = () => false,
      metadata,
      plugin,
    },
    self: {id: actorId},
  }) => {
    /**
     * Maybe creates a new {@link PluginMetadata} object, depending on the
     * `plugin`.
     *
     * At time of resolution, the metadata's `id` is derived from the `name`
     * field of its ancestor `package.json`, and the `description` is derived
     * from that as well. However, a {@link Plugin} can provide a `name` and
     * `description` field once imported, which should override the metadata's
     * `id` and `description` fields (derived from `package.json`).
     * {@link PluginMetadata} objects are immutable, so we create a new one.
     * There won't be any conflicts, because the metadata is not yet stored in
     * the plugin map.
     *
     * Note that {@link Plugin.name} maps to {@link PluginMetadata.id}.
     */
    if (plugin?.name || plugin?.description || plugin?.version) {
      const updates = {
        description: plugin.description ?? metadata.description,
        id: plugin.name ?? metadata.id,
        version: plugin.version ?? metadata.version,
      };
      metadata = PluginMetadata.create(metadata, updates);
    }

    const createComponent = <T extends ComponentKind>(
      kind: T,
      componentId: string,
      componentName: string = DEFAULT_COMPONENT_ID,
      isBlessed = false,
    ): Readonly<Component<T>> => {
      const pluginName = metadata.id;
      return Object.freeze({
        componentName,
        id: componentId,
        isBlessed,
        kind,
        plugin: serialize(metadata),
        pluginName,
      });
    };

    const registerComponent: RegisterComponentFn = <T extends ComponentKind>(
      kind: T,
      componentObject: ComponentObject<T>,
      name?: string,
    ): void => {
      const componentName = name ?? componentObject.name;
      const {id: pluginName} = metadata;
      const isBlessed = isBlessedPlugin(pluginName);
      const componentId = getComponentId(metadata.id, componentName, isBlessed);
      if (
        componentRegistry.has(componentObject) ||
        newComponents.has(componentObject)
      ) {
        throw new ComponentCollisionError(
          `${kind} "${id}" already exists as "${
            componentRegistry.get(componentObject)!.id
          }"`,
          metadata.id,
          componentName,
        );
      }
      const component = createComponent(kind, componentId, name, isBlessed);
      newComponents.set(componentObject, component);
    };

    const newComponents = new Map<SomeComponentObject, Readonly<Component>>();

    const pluginApi = createPluginAPI(registerComponent, metadata);

    try {
      await plugin.plugin(pluginApi);
    } catch (err) {
      return {
        actorId,
        error: new PluginInitError(err, metadata),
        id,
        metadata,
        newComponents: [...newComponents],
        plugin,
        type: ERROR,
      };
    }

    return {
      actorId,
      id,
      metadata,
      newComponents: [...newComponents],
      plugin,
      type: OK,
    };
  },
);
