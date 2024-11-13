import {type StaticPluginMetadata} from '#defs/plugin';
import {BaseSmokerError} from '#error/base-error';
import {fromUnknownError} from '#util/from-unknown-error';

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
