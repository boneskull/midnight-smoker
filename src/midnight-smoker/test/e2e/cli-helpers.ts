import {type ExecResult} from '#schema/exec-result';
import {isExecaError} from '#util/guard/execa-error';
import {stripAnsi} from '#util/strip-ansi';
import execa, {type NodeOptions} from 'execa';

import {createDebug} from '../debug.js';

const debug = createDebug(__filename);

export const CLI_PATH = require.resolve('../../bin/smoker.js');

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
): Promise<ExecResult>;

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
  let result: ExecResult;
  try {
    result = await execa(CLI_PATH, args, {
      env: {...process.env, DEBUG: ''},
      ...execaOpts,
    });
    if (json) {
      return JSON.parse(result.stdout) as unknown;
    }
  } catch (err) {
    if (isExecaError(err) && json) {
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
    .replace(/(?<=\/)\S+?\.(log|tgz|txt)/g, 'path/to/some.$1')
    .replace(/--pack-destination=\S+/g, '--pack-destination=/path/to/dir')
    // strip the versions since it will change
    .replace(/midnight-smoker v\d+\.\d+\.\d+/g, 'midnight-smoker v<version>')
    .replace(/--version\\n\\n\d+\.\d+\.\d+/g, '--version\\n\\n<version>')
    // strip the path to `cli.js` since it differs per platform
    .replace(/node(\.exe)?\s+\S+?smoker\.js/g, 'path/to/smoker.js')
    .replace(/(?<=npm\serror\s)\d{3}.+?(?=\n)/g, '<stuff>')
    .replace(/(?<="tarballFilepath":\s+")[^"]+(?=")/g, '<tarball.tgz>')
    // XXX: warning: this is not the same as in plugin-default
    .replace(/(?<=(['"]).+?Command failed.*?:\s).+(?=\1,?\n)/g, '<command>')
    .replace(
      /(?<=Command\sfailed\swith\sexit\scode\s1:\s).+?(?=\n)/g,
      '<command>',
    )
    // paths
    .replace(/(?<=")([A-Z]:\\\\|\/)[^"]+(?=")/g, '/some/path')
    // problem keys
    .replace(
      /(?<=\b(?:cwd|localPath|dest|version|escapedCommand|command|stack)["']?:\s+)(['"]).+\1(?=,?\n)/g,
      '$1<path>$1',
    )
    // stack traces
    .replace(/(?<=(?:\s{2}-\s|\sin\sdir\s))[^:]+?:\d+/g, '<file>:<line>')
    .replace(/(?<=\n\s{4})(?:[^:]+?:)\d+:\d+/g, '/some/path:<line>:<col>');

  if (stripPmVersions) {
    result = result.replace(
      /(npm|yarn|pnpm|midnight-smoker)@(?:(?:\d+\.\d+\.\d+)|latest)/g,
      '$1@<version>',
    );
  }

  return result.trim();
}
