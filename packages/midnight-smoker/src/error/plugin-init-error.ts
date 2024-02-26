import type {Plugin} from '#plugin/plugin';
import type {PluginMetadata} from '#plugin/plugin-metadata';
import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin fails to initialize--when its `PluginFactory` throws or
 * rejects.
 *
 * @group Errors
 * @internal
 */

export class PluginInitError extends BaseSmokerError<
  {
    metadata: Readonly<PluginMetadata>;
    plugin: Plugin;
  },
  Error
> {
  public readonly id = 'PluginInitError';

  constructor(
    error: Error,
    metadata: Readonly<PluginMetadata>,
    plugin: Plugin,
  ) {
    super(
      `Plugin ${metadata} failed to initialize: ${error.message}`,
      {
        metadata,
        plugin,
      },
      error,
    );
  }
}
