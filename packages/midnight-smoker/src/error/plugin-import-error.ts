import type {PluginMetadata} from '../plugin/plugin-metadata';
import {BaseSmokerError} from './base-error';

export class PluginImportError extends BaseSmokerError<
  {
    metadata: Readonly<PluginMetadata>;
  },
  Error
> {
  public readonly id = 'PluginImportError';

  constructor(error: Error, metadata: Readonly<PluginMetadata>) {
    super(
      `Plugin ${metadata} failed to import: ${error.message}`,
      {
        metadata,
      },
      error,
    );
  }
}
