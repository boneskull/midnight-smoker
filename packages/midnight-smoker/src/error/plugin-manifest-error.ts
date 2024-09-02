import {fromUnknownError} from '#util/error-util';

import {BaseSmokerError} from './base-error';

/**
 * Thrown when a plugin's manifest cannot be found or is otherwise invalid.
 *
 * @group Errors
 */

export class PluginManifestError extends BaseSmokerError<
  {
    cwd: string;
    moduleId: string;
  },
  Error
> {
  public readonly name = 'PluginManifestError';

  constructor(moduleId: string, cwd: string, error: unknown) {
    const err = fromUnknownError(error);
    super(
      `Could not find or read package.json for plugin with module ID ${moduleId} from ${cwd}`,
      {
        cwd,
        moduleId,
      },
      err,
    );
  }
}
