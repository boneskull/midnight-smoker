import {isError, isString} from 'lodash';

import {BaseSmokerError} from './base-error.js';

export class UnknownError extends BaseSmokerError<void, unknown> {
  public readonly name = 'UnknownError';

  constructor(error: unknown) {
    const msg = isError(error)
      ? error.message
      : isString(error)
        ? error
        : 'An unknown error occurred';
    super(msg, undefined, error);
  }
}
