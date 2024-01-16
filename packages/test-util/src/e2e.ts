/**
 * E2E test utilities for `midnight-smoker`.
 *
 * @packageDocumentation
 */
import Debug from 'debug';
import {node as execa, type NodeOptions} from 'execa';
import {Helpers, type Executor} from 'midnight-smoker/plugin';
import stripAnsi from 'strip-ansi';
import type {Merge} from 'type-fest';

const debug = Debug('midnight-smoker:test-util:e2e');

/**
 * Path to the `smoker` executable.
 */
export const CLI_PATH = require.resolve('midnight-smoker/smoker');

export interface ExecSmokerOpts extends NodeOptions {
  json?: boolean;
}

export type ExecSmokerOptsWithJson = Merge<ExecSmokerOpts, {json: true}>;

/**
 * Execute `smoker` with the given `args` and `opts` using {@link execa.node}.
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
 * @param args - Args to `smoker`
 * @param opts - Options, mostly for `execa`, but must have `json: true`
 * @returns The `stdout` of the `smoker` execution, parsed as JSON
 * @see {@link https://npm.im/execa}
 */
export async function execSmoker(
  args: string[],
  opts: ExecSmokerOptsWithJson,
): Promise<unknown>;

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
  debug(`executing: ${CLI_PATH} ${args.join(' ')}`);
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
    if (Helpers.isExecaError(err) && json) {
      return JSON.parse(err.stdout) as unknown;
    }
    throw err;
  }
  return result;
}

/**
 * Strips a bunch of nondeterministic info from CLI output so that we can take a
 * snapshot of it.
 *
 * @param str - String of CLI output; usually either `stdout` or `stderr`
 * @param stripPmVersions - If true, replace `version` in
 *   `(npm|yarn|pnpm)@<version>` with the string `<version>`.
 * @returns Fixed output
 */
export function fixupOutput(str: string, stripPmVersions = true) {
  let result = stripAnsi(str)
    // strip the paths to npm/node/corepack in command
    .replace(
      /(?:[^" ]+?)(\/(\.)?bin\/(node|npm|corepack)(?:\.exe|\.cmd)?)/g,
      '<path/to/>$1',
    )
    .replace(/--pack-destination=\S+/g, '--pack-destination=<path/to/dir>')
    .replace(/(?<=\b)\S+?\.(log|tgz|txt)/g, '<path/to/some>.$1')
    // strip the versions since it will change
    .replace(/midnight-smoker v\d+\.\d+\.\d+/g, 'midnight-smoker v<version>')
    .replace(/--version\\n\\n\d+\.\d+\.\d+/g, '--version\\n\\n<version>')
    // strip the path to `cli.js` since it differs per platform
    .replace(/node(\.exe)?\s+\S+?smoker\.js/g, '<path/to/>smoker.js')
    // more directories
    .replace(/"cwd":\s+"[^"]+"/g, '"cwd": "<cwd>"')
    .replace(/(cwd|dest):\s+'[^']+'/g, "$1: '<$1>'")
    .replace(/in\sdir\s+[^:]+/g, 'in dir <cwd>')
    .replace(
      /"tarballFilepath":\s+"[^"]+"/g,
      '"tarballFilepath": "<tarball.tgz>"',
    )
    .replace(/"(install|pkg(Json)?)Path":\s+"[^"]+"/g, '"$1": "<some/path>"')
    // stack traces
    .replace(/\s+at\s.+?:\d+:\d+[^\n]+?/g, '<loc>:<line>:<col>');

  if (stripPmVersions) {
    result = result.replace(
      /(npm|yarn|pnpm|midnight-smoker)@\d+\.\d+\.\d+/g,
      '$1@<version>',
    );
  }

  return result;
}
