import {BaseSmokerError} from '#error/base-error';

/**
 * Thrown when an invalid or missing argument is provided to a function.
 *
 * **Prefer `ValidationError` wherever possible.**
 *
 * Generally, this sort of thing should be handled by Zod when interfacing with
 * user-provided code. It's mostly for contributors to `midnight-smoker`
 * itself.
 *
 * @group Errors
 */

export class InvalidArgError extends BaseSmokerError<{
  argName?: string;
  position?: number;
}> {
  public readonly name = 'InvalidArgError';

  public override readonly shouldAskForBugReport = true;

  constructor(
    message: string,
    {argName, position}: {argName?: string; position?: number} = {},
  ) {
    super(message, {argName, position});
  }
}
