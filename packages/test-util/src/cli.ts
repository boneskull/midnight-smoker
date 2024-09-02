/**
 * Utilities for running the `smoker` executable in a child process.
 *
 * @packageDocumentation
 * @see {@link execSmoker}
 */
import Debug from 'debug';
import {node as execa, type NodeOptions} from 'execa';
import * as Executor from 'midnight-smoker/executor';

import {CLI_PATH} from './constants';

const debug = Debug('midnight-smoker:test-util:e2e');

/**
 * Options for {@link execSmoker}
 */
export interface ExecSmokerOpts extends NodeOptions {
  json?: boolean;
}

/**
 * Options for {@link execSmoker} that will always parse the result as JSON.
 */
export type ExecSmokerOptsWithJson = {json: true} & ExecSmokerOpts;

/**
 * Execute `smoker` with the given `args` and `opts` using
 * {@link execa execa.node}.
 *
 * @param args - Args to `smoker`
 * @param opts - Options, mostly for `execa`
 * @returns Result of running the `smoker` executable
 * @see {@link https://npm.im/execa}
 */
export async function execSmoker(
  args: string[],
  opts?: ExecSmokerOpts,
): Promise<Executor.ExecResult>;

/**
 * Execute `smoker`, but parse the result as JSON.
 *
 * If `smoker` exits with a non-zero exit code or otherwise fails, the result
 * will be parsed as JSON and returned. The only way for this to reject would be
 * if parsing JSON fails.
 *
 * @template T - The type of the returned JSON
 * @param args - Args to `smoker`
 * @param opts - Options, mostly for `execa`, but must have `json: true`
 * @returns The `stdout` of the `smoker` execution, parsed as JSON
 * @see {@link https://npm.im/execa}
 */
export async function execSmoker<T = unknown>(
  args: string[],
  opts: ExecSmokerOptsWithJson,
): Promise<T>;

/**
 * Runs the `smoker` executable with the given `args` and `opts` using
 * {@link execa.node}.
 *
 * This will disable the `DEBUG` env variable unless it was explicitly passed.
 *
 * @param args - Arguments to `smoker`
 * @param opts - Options to pass to `execa`
 * @returns Result of running the `smoker` executable
 * @see {@link https://npm.im/execa}
 */
export async function execSmoker(args: string[], opts: ExecSmokerOpts = {}) {
  const {json, ...execaOpts} = opts;
  if (json) {
    args = [...new Set(args).add('--json')];
  }
  debug(`Executing: ${CLI_PATH} ${args.join(' ')}`);
  debug(`CWD: ${opts.cwd}`);
  let result: Executor.ExecResult;
  try {
    result = await execa(CLI_PATH, args, {
      env: {...process.env, DEBUG: ''},
      ...execaOpts,
    });
    if (json) {
      return JSON.parse(result.stdout) as unknown;
    }
  } catch (err) {
    if (Executor.isExecaError(err) && json) {
      return JSON.parse(err.stdout) as unknown;
    }
    throw err;
  }
  return result;
}
