import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {fromUnknownError} from '#util/error-util';
import {serialize} from '#util/serialize';
import {isString} from 'lodash';

import {BaseSmokerError} from './base-error';

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
