import type {StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {BaseSmokerError} from './base-error';

/**
 * Represents an error that occurs when an loading invalid plugin is attempted.
 *
 * @group Errors
 * @internal
 */

export class InvalidPluginError extends BaseSmokerError<
  {
    metadata: StaticPluginMetadata;
    rawPlugin?: unknown;
  },
  Error
> {
  public readonly id = 'InvalidPluginError';

  constructor(
    error: Error,
    metadata: StaticPluginMetadata,
    rawPlugin?: unknown,
  ) {
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
