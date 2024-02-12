import type {PluginMetadata} from '../plugin/metadata';
import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin is registered with a name that is already taken.
 *
 * @group Errors
 * @internal
 */

export class PluginConflictError extends BaseSmokerError<{
  pluginId: string;
  existing: PluginMetadata;
  incoming: PluginMetadata;
}> {
  public readonly id = 'PluginConflictError';

  constructor(existing: PluginMetadata, incoming: PluginMetadata) {
    super(
      `Plugin ${existing.id} from ${incoming.entryPoint} conflicts with ${existing.entryPoint}`,
      {pluginId: existing.id, existing, incoming},
    );
  }
}
