import type {PluginMetadata} from '../plugin/metadata';
import type {Plugin} from '../plugin/plugin';
import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin fails to initialize--when its `PluginFactory` throws or
 * rejects.
 *
 * @group Errors
 * @internal
 */

export class PluginInitializationError extends BaseSmokerError<
  {
    metadata: PluginMetadata;
    plugin: Plugin;
  },
  Error
> {
  public readonly id = 'PluginInitializationError';

  constructor(error: Error, metadata: PluginMetadata, plugin: Plugin) {
    super(
      `Plugin ${metadata} failed to initialize`,
      {
        metadata,
        plugin,
      },
      error,
    );
  }
}
