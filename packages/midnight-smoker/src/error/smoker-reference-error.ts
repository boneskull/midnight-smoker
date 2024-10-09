import {BaseSmokerError} from '#error/base-error';

/**
 * Like a {@link ReferenceError}, but with an error code.
 *
 * @group Errors
 */

export class SmokerReferenceError<
  T extends object | void = void,
> extends BaseSmokerError<T> {
  public readonly name = 'SmokerReferenceError';

  constructor(message: string, context?: T) {
    super(message, context as T);
  }
}
