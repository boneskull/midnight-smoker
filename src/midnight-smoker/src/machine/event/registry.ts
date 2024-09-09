import type {PluginImportError} from '#error/plugin-import-error';
import type {ValidationError} from '#error/validation-error';
import type {RegisterPluginLogicOutput} from '#machine/actor/register-plugin';
import type {ResolvePluginLogicOutput} from '#machine/actor/resolve-plugin';
import type {ComponentRegistryEntries} from '#plugin/component';
import type {PluginMetadata} from '#plugin/plugin-metadata';
import type {Plugin} from '#schema/plugin';
import type {SomeUniqueId} from '#util/unique-id';
import type {DoneActorEvent, ErrorActorEvent, EventObject} from 'xstate';

import type {MachineEvent} from './common.js';

export type RegistryMachineRegisteredEvent = MachineEvent<
  'REGISTERED',
  {
    id: SomeUniqueId;
    metadata: Readonly<PluginMetadata>;
    newComponents: ComponentRegistryEntries;
  }
>;

export interface RegistryMachineCloseEvent {
  sender?: string;
  type: 'CLOSE';
}

export interface RegistryMachineRegisterDoneEvent
  extends DoneActorEvent<RegisterPluginLogicOutput> {
  type: 'xstate.done.actor.registerPlugin.*';
}

export interface RegistryMachineRegisterErrorEvent
  extends ErrorActorEvent<PluginImportError | ValidationError> {
  type: 'xstate.error.actor.registerPlugin.*';
}

export interface RegistryMachineRegisterPluginEvent
  extends RegisterPluginActionParams {
  type: 'REGISTER_PLUGIN';
}

export interface RegistryMachineRegisterPluginsEvent extends EventObject {
  /**
   * Current working directory
   */
  cwd?: string;
  id: SomeUniqueId;

  /**
   * A plugin ID or list of plugin IDs to attempt to register
   */
  pluginIds: readonly string[];
  type: 'REGISTER_PLUGINS';
}

export interface RegistryMachineResolveDoneEvent
  extends DoneActorEvent<ResolvePluginLogicOutput> {
  type: 'xstate.done.actor.resolvePlugin.*';
}

export interface RegistryMachineResolveErrorEvent extends ErrorActorEvent {
  type: 'xstate.error.actor.resolvePlugin.*';
}

/**
 * Parameters for the `registerPlugin` action
 */

export type RegisterPluginActionParams = {
  id: SomeUniqueId;
  metadata: Readonly<PluginMetadata>;
  plugin: Plugin;
};
