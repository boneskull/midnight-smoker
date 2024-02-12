import type {PluginMetadata} from '../plugin/metadata';
import {BaseSmokerError} from './base-error';

/**
 * Represents an error that occurs when an loading invalid plugin is attempted.
 *
 * @group Errors
 * @internal
 */

export class InvalidPluginError extends BaseSmokerError<
  {
    metadata: PluginMetadata;
    rawPlugin?: unknown;
  },
  Error
> {
  public readonly id = 'InvalidPluginError';

  constructor(error: Error, metadata: PluginMetadata, rawPlugin?: unknown) {
    super(
      `Alleged plugin at ${metadata.entryPoint} is invalid`,
      {
        metadata,
        rawPlugin,
      },
      error,
    );
  }
}
