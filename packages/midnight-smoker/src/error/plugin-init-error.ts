import type {StaticPluginMetadata} from '#schema/static-plugin-metadata';
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
    metadata: StaticPluginMetadata;
  },
  Error
> {
  public readonly id = 'PluginInitError';

  constructor(error: Error, metadata: StaticPluginMetadata) {
    super(
      `Plugin ${metadata.id} failed to initialize: ${error.message}`,
      {
        metadata,
      },
      error,
    );
  }
}
