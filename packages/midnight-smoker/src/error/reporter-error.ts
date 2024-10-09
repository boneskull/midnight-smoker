import {BaseSmokerError} from '#error/base-error';
import {fromUnknownError} from '#util/from-unknown-error';

import {type Reporter} from '../defs/reporter';

/**
 * @group Errors
 */

export class ReporterError<Ctx extends object = object> extends BaseSmokerError<
  {
    reporter: Reporter<Ctx>;
  },
  Error
> {
  public readonly name = 'ReporterError';

  constructor(error: unknown, reporter: Reporter<Ctx>) {
    const err = fromUnknownError(error);
    super(
      `Reporter "${reporter.name}" errored: ${err.message}`,
      {reporter},
      err,
    );
  }
}
