import type {ExecaError} from 'execa';
import {BaseSmokerError} from './base-error';

/**
 * This mainly just wraps an {@link ExecaError}.
 *
 * @group Errors
 */
export class ExecError extends BaseSmokerError<{command: string}, ExecaError> {
  public readonly id = 'ExecError';

  public readonly command: string;

  public readonly exitCode: number;

  public readonly all?: string;

  public readonly stderr: string;

  public readonly stdout: string;

  public readonly failed: boolean;

  constructor(error: ExecaError) {
    super(error.message, {command: error.command}, error);
    this.command = error.command;
    this.exitCode = error.exitCode;
    this.all = error.all;
    this.stderr = error.stderr;
    this.stdout = error.stdout;
    this.failed = error.failed;
  }
}
