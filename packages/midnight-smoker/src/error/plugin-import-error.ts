import type {PluginMetadata} from '../plugin/metadata';
import {BaseSmokerError} from './base-error';

export class PluginImportError extends BaseSmokerError<
  {
    metadata: PluginMetadata;
  },
  Error
> {
  public readonly id = 'PluginImportError';

  constructor(error: Error, metadata: PluginMetadata) {
    super(
      `Plugin ${metadata} failed to import: ${error.message}`,
      {
        metadata,
      },
      error,
    );
  }
}
