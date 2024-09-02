import {fromUnknownError} from '#util/error-util';
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
    cwd: string;
    pluginSpecifier: string;
  },
  Error
> {
  public readonly name = 'PluginResolutionError';

  constructor(error: unknown, pluginSpecifier: string, cwd: string) {
    const err = fromUnknownError(error);
    super(
      `Could not resolve plugin ${cyanBright(pluginSpecifier)}`,
      {
        cwd,
        pluginSpecifier,
      },
      err,
    );
  }
}
