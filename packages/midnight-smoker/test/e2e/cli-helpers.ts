import {ExecError} from '#executor';
import {
  type ExecFn,
  type ExecOptions,
  type ExecOutput,
} from '#schema/exec-output';
import {exec} from '#util/exec';
import {stripAnsi} from '#util/format';
import {isSmokerError} from '#util/guard/smoker-error';
import {type Merge} from 'type-fest';

import {createDebug} from '../debug';

const debug = createDebug(__filename);

export const CLI_PATH = require.resolve('../../bin/smoker.js');

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
