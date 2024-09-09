import {BaseSmokerError} from './base-error.js';

/**
 * @group Errors
 */
export class UnknownWorkspaceError extends BaseSmokerError<
  {
    name: string;
  },
  Error | undefined
> {
  public readonly name = 'UnknownWorkspaceError';

  constructor(message: string, name: string, error?: Error) {
    super(message, {name}, error);
  }
}
