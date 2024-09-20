/**
 * Various schemas relating to `Executor`s.
 *
 * @packageDocumentation
 */
import type {SpawnOptions} from 'child_process';

import {AssertionError} from '#error/assertion-error';
import {asValidationError} from '#error/validation-error';
import {z} from 'zod';

/**
 * The output of the `exec` function.
 */
export type ExecOutput = {
  command: string;
  cwd: string;
  exitCode?: number;
  stderr: string;
  stdout: string;
};

/**
 * The return type of the `exec` function, which is a `PromiseLike` thing that
 * contains a reference to the underlying child process.
 *
 * It will resolve with a {@link ExecOutput}
 */
export type ExecResult<
  Output extends object = object,
  Extra extends object = object,
> = Extra & PromiseLike<ExecOutput & Output>;

/**
 * Asserts given `value` is an {@link ExecResult}.
 *
 * @param value Any value
 */
export function assertExecOutput(value: unknown): asserts value is ExecOutput {
  try {
    ExecOutputSchema.parse(value);
  } catch (err) {
    const error = asValidationError(err, 'Not an ExecOutput object');
    throw new AssertionError(error.message, error);
  }
}

/**
 * Schema for the result of running an `Executor` or an {@link ExecFn}.
 *
 * A `PkgManager` will need to deal with these directly, and may need to return
 * them itself (e.g., `InstallResult`)
 */
export const ExecOutputSchema: z.ZodType<ExecOutput> = z
  .object({
    command: z.string().describe('The command that was run'),
    cwd: z.string().describe('The working directory of the command'),
    exitCode: z.number().optional().describe('The exit code of the command'),
    stderr: z.string().describe('The stderr of the command'),
    stdout: z.string().describe('The stdout of the command'),
  })
  .describe('The resolved value of an `ExecFn`');

/**
 * Options for the `exec` function
 */
export type ExecOptions<T extends object = object> = {
  nodeOptions?: SpawnOptions;
  signal?: AbortSignal;
  timeout?: number;
  trim?: boolean;
  verbose?: boolean;
} & T;

/**
 * Implementation of an `exec` function; it should implement both signatures.
 */
export interface ExecFn<
  Output extends object = object,
  Result extends object = object,
  Options extends object = object,
> {
  /**
   * Execute a shell command
   */
  (command: string, options?: ExecOptions<Options>): ExecResult<Output, Result>;

  /**
   * Execute a shell command with arguments
   */
  (
    command: string,
    args?: string[],
    options?: ExecOptions<Options>,
  ): ExecResult<Output, Result>;
}
