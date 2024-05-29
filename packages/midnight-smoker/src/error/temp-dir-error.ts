import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {isString} from 'lodash';
import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class TempDirError extends BaseSmokerError<
  {spec: string},
  NodeJS.ErrnoException
> {
  public readonly id = 'TempDirError';

  constructor(
    message: string,
    spec: string | StaticPkgManagerSpec,
    error: NodeJS.ErrnoException,
  ) {
    super(message, {spec: isString(spec) ? spec : spec.spec}, error);
  }
}
