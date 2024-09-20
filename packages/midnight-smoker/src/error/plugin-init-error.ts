import {BaseSmokerError} from '#error/base-error';
import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {fromUnknownError} from '#util/error-util';

/**
 * Thrown when a plugin fails to initialize--when its `PluginFactory` throws or
 * rejects.
 *
 * @group Errors
 */

export class PluginInitError extends BaseSmokerError<
  {
    metadata: StaticPluginMetadata;
  },
  Error
> {
  public readonly name = 'PluginInitError';

  constructor(error: unknown, metadata: StaticPluginMetadata) {
    const err = fromUnknownError(error);
    super(
      `Plugin ${metadata.id} failed to initialize: ${err.message}`,
      {
        metadata,
      },
      err,
    );
  }
}
