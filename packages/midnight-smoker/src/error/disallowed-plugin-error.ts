import type {PluginMetadata} from '#plugin/plugin-metadata';
import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin is disallowed by the registry.
 *
 * @group Errors
 * @internal
 */

export class DisallowedPluginError extends BaseSmokerError<{
  metadata?: PluginMetadata;
}> {
  public readonly id = 'DisallowedPluginError';

  constructor(metadata?: PluginMetadata) {
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
