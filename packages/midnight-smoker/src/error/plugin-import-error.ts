import type {StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {BaseSmokerError} from './base-error';

export class PluginImportError extends BaseSmokerError<
  {
    metadata: StaticPluginMetadata;
  },
  Error
> {
  public readonly id = 'PluginImportError';

  constructor(error: Error, metadata: StaticPluginMetadata) {
    super(
      `Plugin ${metadata.id} failed to import: ${error.message}`,
      {
        metadata,
      },
      error,
    );
  }
}
