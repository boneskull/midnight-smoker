import {BaseSmokerError} from './base-error.js';

/**
 * Like a {@link ReferenceError}, but with an error code.
 *
 * @group Errors
 */

export class SmokerReferenceError extends BaseSmokerError {
  public readonly name = 'SmokerReferenceError';
}
