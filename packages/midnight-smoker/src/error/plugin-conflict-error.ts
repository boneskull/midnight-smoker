import type {StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin is registered with a name that is already taken.
 *
 * @group Errors
 * @internal
 */

export class PluginConflictError extends BaseSmokerError<{
  pluginId: string;
  existing: StaticPluginMetadata;
  incoming: StaticPluginMetadata;
}> {
  public readonly id = 'PluginConflictError';

  constructor(existing: StaticPluginMetadata, incoming: StaticPluginMetadata) {
    super(
      `Plugin ${existing.id} from ${incoming.entryPoint} conflicts with ${existing.entryPoint}`,
      {pluginId: existing.id, existing, incoming},
    );
  }
}
