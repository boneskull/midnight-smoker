import {BaseSmokerError} from '../../error/base-error';
import type {ReporterDef} from './reporter-types';

/**
 * @group Errors
 */

export class ReporterError extends BaseSmokerError<
  {
    reporter: ReporterDef;
  },
  Error
> {
  public readonly id = 'ReporterError';
  constructor(error: Error, reporter: ReporterDef) {
    super(
      `Reporter ${reporter.name} threw while initializing: ${error.message}`,
      {reporter},
      error,
    );
  }
}
