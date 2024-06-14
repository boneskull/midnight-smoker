import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {isString} from 'lodash';
import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class TempDirError extends BaseSmokerError<{spec: string}, Error> {
  public readonly id = 'TempDirError';

  constructor(
    message: string,
    spec: string | StaticPkgManagerSpec,
    error: Error,
  ) {
    super(message, {spec: isString(spec) ? spec : spec.spec}, error);
  }
}
