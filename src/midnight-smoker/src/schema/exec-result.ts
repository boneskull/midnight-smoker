/**
 * Various schemas relating to `Executor`s.
 *
 * @packageDocumentation
 */

import {AssertionError} from '#error/assertion-error';
import {asValidationError} from '#error/validation-error';
import {type ExecaReturnValue} from 'execa';
import {type Simplify} from 'type-fest';
import {z} from 'zod';

/**
 * Schema for the result of running an `Executor`.
 *
 * A `PkgManager` will need to deal with these directly, and may need to return
 * them itself (e.g., `InstallResult`)
 *
 * Based on {@link ExecaReturnValue}
 *
 * @remarks
 * Use {@link ExecResult} instead of {@link ExecaReturnValue}!
 */
export const ExecResultSchema: z.ZodType<ExecResult> = z
  .object({
    all: z.string().optional().describe('The combination stdout and stderr'),
    command: z.string().describe('The command that was run'),
    escapedCommand: z.string().describe('Same as `command` but escaped'),
    exitCode: z.number().describe('The exit code of the command'),
    failed: z.boolean().describe('Whether or not the command failed'),
    isCanceled: z.boolean().describe('Whether the process was canceled'),
    killed: z.boolean().describe('Whether the process was killed'),
    stderr: z.string().describe('The stderr of the command'),
    stdout: z.string().describe('The stdout of the command'),
    timedOut: z.boolean().describe('Whether the process timed out'),
  })
  .describe('The return type of running `execa`');

/**
 * The result of running an `Executor`.
 */
export type ExecResult = Simplify<ExecaReturnValue>;

/**
 * Asserts given `value` is an {@link ExecResult}.
 *
 * @param value Any value
 */
export function assertExecResult(value: unknown): asserts value is ExecResult {
  try {
    ExecResultSchema.parse(value);
  } catch (err) {
    const error = asValidationError(err, 'Not a proper ExecResult object');
    throw new AssertionError(error.message, error);
  }
}
