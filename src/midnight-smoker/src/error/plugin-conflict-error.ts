import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {serialize} from '#util/serialize';

import {BaseSmokerError} from './base-error.js';

/**
 * Thrown when a plugin is registered with a name or entry point that is already
 * taken.
 *
 * @group Errors
 * @internal
 */

export class PluginConflictError extends BaseSmokerError<{
  existing: StaticPluginMetadata;
  incoming: StaticPluginMetadata;
  pluginId: string;
}> {
  public readonly name = 'PluginConflictError';

  constructor(existing: StaticPluginMetadata, incoming: StaticPluginMetadata) {
    existing = serialize(existing);
    incoming = serialize(incoming);
    super(
      `Plugin "${existing.id}" already registered with name or entry point ${incoming.entryPoint}`,
      {existing, incoming, pluginId: existing.id},
    );
  }
}
