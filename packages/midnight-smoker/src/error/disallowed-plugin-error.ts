import type {StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin is disallowed by the registry.
 *
 * @group Errors
 * @internal
 */

export class DisallowedPluginError extends BaseSmokerError<{
  metadata?: StaticPluginMetadata;
}> {
  public readonly id = 'DisallowedPluginError';

  constructor(metadata?: StaticPluginMetadata) {
    super(
      metadata
        ? `Plugin ${metadata.id} from ${metadata.entryPoint} disallowed`
        : 'Plugin registration closed',
      {
        metadata,
      },
    );
  }
}
