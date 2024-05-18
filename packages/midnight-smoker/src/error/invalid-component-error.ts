import {BaseSmokerError} from './base-error';

export class InvalidComponentError extends BaseSmokerError<{
  def: unknown;
}> {
  public readonly id = 'InvalidComponentError';

  constructor(message: string, def: unknown) {
    super(message, {def});
  }
}
