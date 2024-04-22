import type {ReporterDef} from '#schema/reporter-def';
import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */

export class ReporterError<Ctx = unknown> extends BaseSmokerError<
  {
    reporter: ReporterDef<Ctx>;
  },
  Error
> {
  public readonly id = 'ReporterError';

  constructor(error: Error, reporter: ReporterDef<Ctx>) {
    super(
      `Reporter ${reporter.name} threw: ${error.message}`,
      {reporter},
      error,
    );
  }
}
