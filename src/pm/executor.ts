import type {Options as ExecaOptions} from 'execa';

/**
 * Options for {@linkcode Executor.exec}
 */
export interface ExecOpts {
  /**
   * If this is true, `stdout` and `stderr` will be echoed to the terminal.
   */
  verbose?: boolean;
}

/**
 * This is the parts of `execa.ExecaReturnValue` that we care about.
 */
export interface ExecResult {
  stdout: string;
  stderr: string;
  command: string;
  exitCode: number;
  failed: boolean;
}

/**
 * An `execa.ExecaError` is _not just_ an `Error`, but also an `execa.ExecaReturnValue`!
 * Magic!
 */
export type ExecError = ExecResult & Error;

/**
 * A wrapper around {@linkcode execa} which controls the _command_ to be executed.
 */
export interface Executor {
  /**
   * Execute whatever thing this Executor is supposed to execute, given the
   * arguments and options.
   */
  exec(
    args: string[],
    execaOpts?: ExecaOptions,
    execOpts?: ExecOpts,
  ): Promise<ExecResult>;
}
