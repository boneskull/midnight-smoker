/**
 * E2E test harness helpers
 * @module
 */
import {node as execa, type ExecaReturnValue, type NodeOptions} from 'execa';
import path from 'node:path';
import {inspect} from 'node:util';
import createDebug from 'debug';

const debug = createDebug('midnight-smoker:test:e2e');

/**
 * If running in Wallaby, we'll need this
 */
export const CWD = process.env.WALLABY_PROJECT_DIR
  ? process.env.WALLABY_PROJECT_DIR
  : path.resolve(__dirname, '..', '..');

export const CLI_PATH = path.join(CWD, 'bin', 'smoker.js');

export async function execSmoker(
  args: string[],
  opts: NodeOptions = {},
): Promise<ExecaReturnValue> {
  debug(`executing: ${CLI_PATH} ${args.join(' ')}`);
  return execa(CLI_PATH, args, {
    cwd: CWD,
    env: {DEBUG: ''},
    ...opts,
  });
}

/**
 * For debugging
 * @param obj A thing to dump
 */
export function dump(obj: any): void {
  console.error(inspect(obj, {depth: null, colors: true}));
}

/**
 * Strips a bunch of stuff out of a CLI output string that is dependent upon
 * local paths and current versions, etc; stuff that isn't suitable for snapshots.
 * @param stdout String of CLI output
 * @param stripPmVersions If true, replace `version` in `(npm|yarn|pnpm)@<version>` with the string `<version>`.
 * @returns Fixed output
 */
export function fixupOutput(stdout: string, stripPmVersions = true) {
  let result = stdout
    // strip the paths to npm/node/corepack in command
    .replace(
      /(?:[^" ]+?)(\/(\.)?bin\/(node|npm|corepack)(?:\.exe|\.cmd)?)/g,
      '<path/to/>$1',
    )
    // strip the versions since it will change
    .replace(/midnight-smoker v\d+\.\d+\.\d+/g, 'midnight-smoker v<version>')
    .replace(/--version\\n\\n\d+\.\d+\.\d+/g, '--version\\n\\n<version>')
    // strip the path to `cli.js` since it differs per platform
    .replace(/node(\.exe)?\s+\S+?smoker\.js/g, '<path/to/>smoker.js')
    .replace(/"cwd":\s+"[^"]+"/g, '"cwd": "<cwd>"')
    .replace(
      /"tarballFilepath":\s+"[^"]+"/g,
      '"tarballFilepath": "<tarball.tgz>"',
    )
    .replace(/"installPath":\s+"[^"]+"/g, '"installPath": "<some/path>"');

  if (stripPmVersions) {
    result = result.replace(
      /(npm|yarn|pnpm|midnight-smoker)@\d+\.\d+\.\d+/g,
      '$1@<version>',
    );
  }

  return result;
}
