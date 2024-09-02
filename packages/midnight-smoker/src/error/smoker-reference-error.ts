import {BaseSmokerError} from './base-error';

/**
 * Like a {@link ReferenceError}, but with an error code.
 *
 * @group Errors
 */

export class SmokerReferenceError extends BaseSmokerError {
  public readonly name = 'SmokerReferenceError';
}
