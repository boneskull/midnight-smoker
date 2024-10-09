import {BaseSmokerError} from '#error/base-error';
import {cyanBright, italic} from 'chalk';

/**
 * Thrown when a plugin fails to load because it could not be found.
 *
 * @group Errors
 */

export class UnresolvablePluginError extends BaseSmokerError<{
  attemptedResolutionFrom: string[];
  pluginSpecifier: string;
}> {
  public readonly name = 'UnresolvablePluginError';

  constructor(pluginSpecifier: string, attemptedResolutionFrom: string[]) {
    super(
      `Could not resolve plugin ${cyanBright(pluginSpecifier)}. ${italic(
        'Where could it be??',
      )}`,
      {
        attemptedResolutionFrom,
        pluginSpecifier,
      },
    );
  }
}
