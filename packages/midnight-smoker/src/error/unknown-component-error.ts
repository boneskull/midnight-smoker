import {BaseSmokerError} from './base-error';

export class UnknownComponentError extends BaseSmokerError<{
  value: unknown;
}> {
  public readonly name = 'UnknownComponentError';

  constructor(message: string, value: unknown) {
    super(message, {value});
  }
}
