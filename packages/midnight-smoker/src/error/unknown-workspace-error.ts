import {BaseSmokerError} from './base-error';

/**
 * @group Errors
 */
export class UnknownWorkspaceError extends BaseSmokerError<
  {
    name: string;
  },
  Error | undefined
> {
  public readonly id = 'UnknownWorkspaceError';

  constructor(message: string, name: string, error?: Error) {
    super(message, {name}, error);
  }
}
