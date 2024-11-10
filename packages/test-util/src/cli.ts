/**
 * Utilities for running the `smoker` executable in a child process.
 *
 * @packageDocumentation
 * @see {@link execSmoker}
 */

import {ExecError} from 'midnight-smoker/error';
import {
  type ExecFn,
  type ExecOptions,
  type ExecOutput,
} from 'midnight-smoker/schema';
import {exec, isSmokerError} from 'midnight-smoker/util';
import {type Merge} from 'type-fest';

import {CLI_PATH} from './constants';
import {createDebug} from './debug';

const debug = createDebug(__filename);

/**
 * Options for {@link execSmoker}
 *
 * @see {@link ExecSmokerOptionsWithJson}
 */
export interface ExecSmokerOptions<Exec extends ExecFn = ExecFn>
  extends ExecOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  exec?: Exec;

  json?: boolean;
}

/**
 * Options for {@link execSmoker} that will always parse the result as JSON.
 */
export type ExecSmokerOptionsWithJson<Exec extends ExecFn = ExecFn> = Merge<
  ExecSmokerOptions<Exec>,
  {
    json: true;
  }
>;

/**
 * Execute `smoker` with the given `args` and `opts`
 *
 * If the command exits with a non-zero code, an {@link ExecError} will be thrown
 * by {@link ExecSmokerOptions.exec exec}. _If and only if_ the
 * {@link ExecSmokerOptions.json `json` flag} is `true`, `execSmoker` will catch
 * this error and fulfill with the result.
 *
 * If the command fails to spawn, `execSmoker` will reject with a `SpawnError`
 * thrown out of {@link ExecSmokerOptions.exec exec}.
 *
 * This will disable the `DEBUG` env variable unless it was explicitly passed.
 *
 * The default `exec` implementation is {@link exec here}.
 *
 * @param args - Args to `smoker`
 * @param opts - Options
 * @returns Result of running the `smoker` executable
 */
export function execSmoker<Exec extends ExecFn = ExecFn>(
  args: string[],
  opts?: ExecSmokerOptions<Exec>,
): Promise<ExecOutput>;

/**
 * Execute `smoker`, but parse the result as JSON.
 *
 * If the command exits with a non-zero code, an {@link ExecError} will be thrown
 * by {@link ExecSmokerOptions.exec exec}. _If and only if_ the
 * {@link ExecSmokerOptions.json `json` flag} is `true`, `execSmoker` will catch
 * this error and fulfill with the result.
 *
 * If the command fails to spawn, `execSmoker` will reject with a `SpawnError`
 * thrown out of {@link ExecSmokerOptions.exec exec}.
 *
 * This will disable the `DEBUG` env variable unless it was explicitly passed.
 *
 * The default `exec` implementation is {@link exec here}.
 *
 * @template T - The type of the returned JSON
 * @param args - Args to `smoker`
 * @param opts - Options, but must have `json: true`
 * @returns The `stdout` of the `smoker` execution, parsed as JSON
 */
export function execSmoker<T = unknown, Exec extends ExecFn = ExecFn>(
  args: string[],
  opts: ExecSmokerOptionsWithJson<Exec>,
): Promise<T>;

/**
 * Runs the `smoker` executable with the given `args` and `opts`.
 *
 * If the command exits with a non-zero code, an {@link ExecError} will be thrown
 * by {@link ExecSmokerOptions.exec exec}. _If and only if_ the
 * {@link ExecSmokerOptions.json `json` flag} is `true`, `execSmoker` will catch
 * this error and fulfill with the result.
 *
 * If the command fails to spawn, `execSmoker` will reject with a `SpawnError`
 * thrown out of {@link ExecSmokerOptions.exec exec}.
 *
 * This will disable the `DEBUG` env variable unless it was explicitly passed.
 *
 * The default `exec` implementation is {@link exec here}.
 *
 * @param args - Arguments to `smoker`
 * @param opts - Options to pass to `exec`
 * @returns Result of running the `smoker` executable
 */
export function execSmoker(args: string[], opts: ExecSmokerOptions = {}) {
  const {
    cwd = process.cwd(),
    env,
    exec: someExec = exec,
    json,
    nodeOptions,
    timeout,
    trim,
    verbose,
    ...extra
  } = opts;
  if (json) {
    args = [...new Set(args).add('--json')];
  }
  debug(`Executing in CWD ${cwd}: ${CLI_PATH} ${args.join(' ')}`);

  const finalEnvOpts = {...process.env, DEBUG: '', ...env};
  const finalNodeOpts = {cwd, env: finalEnvOpts, ...nodeOptions};
  const options: ExecOptions = {
    nodeOptions: finalNodeOpts,
    timeout,
    trim,
    verbose,
    ...extra,
  };

  return someExec(CLI_PATH, args, options).then(
    (output) => {
      return json ? (JSON.parse(output.stdout) as unknown) : output;
    },
    (err) => {
      if (isSmokerError(ExecError, err) && json) {
        return JSON.parse(err.stdout) as unknown;
      }
      throw err;
    },
  );
}
