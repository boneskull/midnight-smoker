import type {ReporterDef} from '#schema/reporter-def.js';
import {BaseSmokerError} from './base-error';

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
