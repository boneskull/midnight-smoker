import {castArray} from 'lodash';
import {AggregateSmokerError} from './base-error';

/**
 * Generic aggregate error for machines
 *
 * @group Errors
 */
export class MachineError extends AggregateSmokerError<{
  machineId: string;
}> {
  public readonly id = 'MachineError';

  public override readonly context: {
    machineId: string;
  };

  static originators = new WeakMap<Error, string>();

  constructor(message: string, errors: Error[] | Error, machineId: string) {
    errors = castArray(errors);
    for (const error of errors) {
      MachineError.originators.set(error, machineId);
    }
    super(message, errors, {machineId});
    this.context = {machineId};
  }

  /**
   * Clone this instance with additional errors and options.
   *
   * @param error Zero or more errors to append to the aggregate
   * @param options Results of linting and running scripts, if any
   * @returns New instance of `SmokeError` with the given errors and options
   */
  clone(error: Error | Error[] = []): MachineError {
    return new MachineError(
      this.message,
      [...this.errors, ...castArray(error)],
      this.context.machineId,
    );
  }
}
