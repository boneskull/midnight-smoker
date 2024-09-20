import {BaseSmokerError} from '#error/base-error';
import {type ExecOutput} from '#schema/exec-result';
import {isNumber} from 'lodash';

/**
 * Thrown by `util.exec`
 *
 * @group Errors
 */
export class ExecError
  extends BaseSmokerError<ExecOutput>
  implements ExecOutput
{
  public readonly command: string;

  public readonly cwd: string;

  public readonly exitCode?: number;

  public readonly name = 'ExecError';

  public readonly stderr: string;

  public readonly stdout: string;

  constructor(message: string, output: ExecOutput) {
    super(message, output);
    this.command = output.command;
    this.exitCode = output.exitCode;
    this.stderr = output.stderr;
    this.stdout = output.stdout;
    this.cwd = output.cwd;
  }

  get failed() {
    return isNumber(this.exitCode) && this.exitCode !== 0;
  }
}
