import {BaseSmokerError} from '#error/base-error';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {isString} from '#util/guard/common';

/**
 * @group Errors
 */

export class TempDirError extends BaseSmokerError<{spec: string}, Error> {
  public readonly name = 'TempDirError';

  constructor(
    message: string,
    spec: StaticPkgManagerSpec | string,
    error: Error,
  ) {
    super(message, {spec: isString(spec) ? spec : spec.label}, error);
  }
}
