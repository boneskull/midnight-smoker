import type {PluginMetadata} from '#plugin/plugin-metadata';
import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin is registered with a name that is already taken.
 *
 * @group Errors
 * @internal
 */

export class PluginConflictError extends BaseSmokerError<{
  pluginId: string;
  existing: Readonly<PluginMetadata>;
  incoming: Readonly<PluginMetadata>;
}> {
  public readonly id = 'PluginConflictError';

  constructor(
    existing: Readonly<PluginMetadata>,
    incoming: Readonly<PluginMetadata>,
  ) {
    super(
      `Plugin ${existing.id} from ${incoming.entryPoint} conflicts with ${existing.entryPoint}`,
      {pluginId: existing.id, existing, incoming},
    );
  }
}
