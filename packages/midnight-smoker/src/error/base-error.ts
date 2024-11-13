import {BUGS_URL} from '#constants';
import {type Serializable} from '#schema/serializable';
import {
  DOUBLE_NL,
  formatCode,
  formatErrorMessage,
  formatStackTrace,
  formatUrl,
  indent,
  joinLines,
} from '#util/format';
import {isSomeSmokerError} from '#util/guard/some-smoker-error';
import {jsonify} from '#util/jsonify';
import {italic, whiteBright} from 'chalk';
import {format} from 'node:util';

import {type SmokerErrorCode, type SmokerErrorName} from './codes';
import {
  errorCodeFor,
  type SmokerError,
  type StaticSmokerError,
} from './smoker-error';

/**
 * Base class for all _non-aggregate_ exceptions thrown by `midnight-smoker`.
 *
 * @template Context - Arbitrary per-exception-class data to attach to the
 *   error.
 * @template Cause - Any caught exception that caused this error to be
 *   instantiated & thrown.
 * @group Errors
 */
export abstract class BaseSmokerError<
    Context extends object | void = void,
    Cause = void,
  >
  extends Error
  implements SmokerError<Context, Cause>, Serializable
{
  public readonly code: SmokerErrorCode;

  /**
   * If true, when formatting the error message, a link to create a bug will be
   * presented
   */
  public readonly shouldAskForBugReport?: boolean;

  constructor(
    message: string,
    public readonly context: Context,
    public override readonly cause?: Cause,
  ) {
    super(message);
    this.code = errorCodeFor(this);
  }

  public format(verbose = false): string {
    const msgWithErrorCode = this.formatMessage(verbose);

    let lines: string[] = [msgWithErrorCode];

    if (verbose) {
      if (this.cause) {
        lines = [...lines, this.formatCause(verbose)];
      }
      const stackTrace = joinLines(
        [whiteBright(italic('Stack Trace:')), formatStackTrace(this)],
        DOUBLE_NL,
      );

      lines = [...lines, stackTrace];
    }

    return joinLines(lines, DOUBLE_NL);
  }

  public formatCause(verbose = false): string {
    if (!this.cause) {
      return '';
    }
    const cause = isSomeSmokerError(this.cause)
      ? this.cause.format(verbose)
      : `${this.cause}`;
    return joinLines(
      [whiteBright(italic('Reason:')), indent(cause, 1)],
      DOUBLE_NL,
    );
  }

  public formatCode(_verbose = false): string {
    return formatCode(this.code);
  }

  public formatMessage(verbose = false): string {
    let msg = format(
      '%s %s',
      formatErrorMessage(this.message),
      this.formatCode(verbose),
    );
    if (this.shouldAskForBugReport) {
      msg = `${msg} — This looks like a bug. Please create a ${formatUrl(
        'bug report',
        BUGS_URL,
      )}`;
    }
    return msg;
  }

  public toJSON(): StaticSmokerError {
    const context = jsonify(this.context);
    const cause = jsonify(this.cause);

    return {
      cause,
      code: this.code,
      context,
      message: this.message,
      name: this.name,
      stack: this.stack,
    };
  }

  public override toString(): string {
    return this.format();
  }

  public abstract override readonly name: SmokerErrorName;
}
