import {BaseSmokerError} from '#error/base-error';

/**
 * Thrown when some stub code gets hit.
 *
 * In a perfect world, this should never be used. But this is not a perfect
 * world because I am so, so tired.
 *
 * @group Errors
 */

export class NotImplementedError extends BaseSmokerError {
  public readonly name = 'NotImplementedError';
}
