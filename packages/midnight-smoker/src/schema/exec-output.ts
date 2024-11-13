/**
 * Various schemas relating to `Executor`s.
 *
 * @packageDocumentation
 */
import type {ChildProcess, SpawnOptions} from 'child_process';

import {z} from 'zod';

/**
 * The output of the `exec` function.
 */
export type ExecOutput = {
  command?: string;
  cwd?: string;
  exitCode?: number;
  stderr: string;
  stdout: string;
};

/**
 * Schema for the result of running an `Executor` or an {@link ExecFn}.
 *
 * A `PkgManager` will need to deal with these directly, and may need to return
 * them itself (e.g., `InstallResult`)
 */
export const ExecOutputSchema: z.ZodType<ExecOutput> = z
  .object({
    command: z.string().optional().describe('The command that was run'),
    cwd: z.string().optional().describe('The working directory of the command'),
    exitCode: z.number().optional().describe('The exit code of the command'),
    stderr: z.string().describe('The stderr of the command'),
    stdout: z.string().describe('The stdout of the command'),
  })
  .describe('The resolved value of an `ExecFn`');

export type SpawnHook = (
  proc: ChildProcess,
  signal: AbortSignal,
) => Promise<void> | void;

/**
 * Options for the `exec` function
 */
export type ExecOptions = {
  /**
   * Additional options to pass to `child_process.spawn()`
   */
  nodeOptions?: SpawnOptions;

  /**
   * Hook to run when the child process is spawned.
   *
   * If this child process fails to spawn, this hook will not be called.
   */
  onSpawn?: SpawnHook;

  /**
   * Timeout in milliseconds.
   *
   * Unlike {@link SpawnOptions.timeout}, this will abort the process and reject
   * with an `AbortError`.
   */
  timeout?: number;

  /**
   * If true, trim `stdout` and `stderr`.
   */
  trim?: boolean;

  /**
   * If true, log the command to the console.
   */
  verbose?: boolean;
};

/**
 * Implementation of an `exec` function; it should implement both signatures.
 */
export interface ExecFn {
  /**
   * Execute a shell command
   */
  (command: string, options?: ExecOptions): Promise<ExecOutput>;

  /**
   * Execute a shell command with arguments
   */
  (
    command: string,
    args?: string[],
    options?: ExecOptions,
  ): Promise<ExecOutput>;
}
