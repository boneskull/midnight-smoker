import {type ExecResult} from '#schema/exec-result';
import {type ExecaError} from 'execa';

import {BaseSmokerError} from './base-error';

/**
 * This mainly just wraps an {@link ExecaError}.
 *
 * @group Errors
 */
export class ExecError
  extends BaseSmokerError<ExecResult>
  implements ExecResult
{
  public readonly all?: string;

  public readonly command: string;

  public readonly escapedCommand: string;

  public readonly exitCode: number;

  public readonly failed: boolean;

  public readonly isCanceled: boolean;

  public readonly killed: boolean;

  public readonly name = 'ExecError';

  public readonly originalMessage?: string;

  public readonly shortMessage: string;

  public readonly stderr: string;

  public readonly stdout: string;

  public readonly timedOut: boolean;

  constructor(error: ExecaError) {
    // avoid empty message
    const message = error.shortMessage || error.message;
    super(message, error);
    this.command = error.command;
    this.exitCode = error.exitCode;
    this.all = error.all;
    this.stderr = error.stderr;
    this.stdout = error.stdout;
    this.failed = error.failed;
    this.shortMessage = error.shortMessage;
    this.originalMessage = error.originalMessage;
    this.timedOut = error.timedOut;
    this.isCanceled = error.isCanceled;
    this.escapedCommand = error.escapedCommand;
    this.killed = error.killed;
  }
}
