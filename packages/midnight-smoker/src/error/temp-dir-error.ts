import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {isString} from 'lodash';

import {BaseSmokerError} from './base-error';

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
