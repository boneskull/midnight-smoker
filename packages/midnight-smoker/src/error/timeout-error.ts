import {BaseSmokerError} from './base-error';

export class TimeoutError extends BaseSmokerError<
  {timeout: number},
  Error | undefined
> {
  public readonly name = 'TimeoutError';

  constructor(message: string, timeout: number, error?: Error) {
    super(message, {timeout}, error);
  }
}
