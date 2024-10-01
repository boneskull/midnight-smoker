import {BaseSmokerError} from '#error/base-error';
import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {fromUnknownError} from '#util/from-unknown-error';
import {isString} from '#util/guard/common';
import {serialize} from '#util/serialize';

export class PluginImportError extends BaseSmokerError<
  {
    metadata: StaticPluginMetadata | string;
  },
  Error
> {
  public readonly name = 'PluginImportError';

  constructor(error: unknown, metadata: StaticPluginMetadata | string) {
    const err = fromUnknownError(error);
    const repr = isString(metadata) ? metadata : metadata.id;
    metadata = serialize(metadata);
    super(
      `Plugin ${repr} failed to import: ${err.message}`,
      {
        metadata,
      },
      err,
    );
  }
}
