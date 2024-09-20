import {BaseSmokerError} from '#error/base-error';
import {type Reporter} from '#schema/reporter';
import {fromUnknownError} from '#util/error-util';

/**
 * @group Errors
 */

export class ReporterError<Ctx = unknown> extends BaseSmokerError<
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
