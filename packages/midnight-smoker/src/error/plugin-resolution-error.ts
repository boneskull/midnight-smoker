import {cyanBright} from 'chalk';
import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin fails to load and the reason is not because it could not
 * be found.
 *
 * @group Errors
 */

export class PluginResolutionError extends BaseSmokerError<
  {
    pluginSpecifier: string;
    cwd: string;
  },
  Error
> {
  public readonly id = 'PluginResolutionError';

  constructor(error: Error, pluginSpecifier: string, cwd: string) {
    super(
      `Could not resolve plugin ${cyanBright(pluginSpecifier)}`,
      {
        pluginSpecifier,
        cwd,
      },
      error,
    );
  }
}
