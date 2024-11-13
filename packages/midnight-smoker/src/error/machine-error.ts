import {castArray} from '#util/common';

import {AggregateSmokerError} from './aggregate-smoker-error';

/**
 * Generic aggregate error for machines
 *
 * @group Errors
 * @todo Add a `toJSON` which maps the internal errors to the origin machine IDs
 */
export class MachineError extends AggregateSmokerError<{
  machineId: string;
}> {
  static #originMachineIds = new WeakMap<Error, string>();

  public override readonly context: {
    machineId: string;
  };

  public readonly name = 'MachineError';

  constructor(message: string, errors: Error | Error[], machineId: string) {
    errors = castArray(errors);
    for (const error of errors) {
      if (!MachineError.#originMachineIds.has(error)) {
        MachineError.#originMachineIds.set(error, machineId);
      }
    }
    super(message, errors, {machineId});
    this.context = {machineId};
  }

  /**
   * Clone this instance with additional errors.
   *
   * @param error Zero or more errors to append to the aggregate
   * @returns New instance of `MachineError` with the given errors and options
   */
  cloneWith(error: Error | Error[] = []): MachineError {
    return new MachineError(
      this.message,
      [...this.errors, ...castArray(error)],
      this.context.machineId,
    );
  }
}
