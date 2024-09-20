import {BaseSmokerError} from '#error/base-error';

/**
 * Thrown when a plugin is disallowed by the registry.
 *
 * @group Errors
 */

export class DisallowedPluginError extends BaseSmokerError {
  public readonly name = 'DisallowedPluginError';

  constructor() {
    super('Plugin registration closed; no further plugins may be registered');
  }
}
