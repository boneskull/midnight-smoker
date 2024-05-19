import {BaseSmokerError} from './base-error';

export class InvalidComponentError extends BaseSmokerError<{
  value: unknown;
}> {
  public readonly id = 'InvalidComponentError';

  constructor(message: string, value: unknown) {
    super(message, {value});
  }
}
