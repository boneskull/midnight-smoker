/**
 * E2E test harness helpers
 * @module
 */
import {node as execa, type ExecaReturnValue, type NodeOptions} from 'execa';
import path from 'node:path';
import {inspect} from 'node:util';

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
export function fixupOutput(stdout: string) {
  return (
    stdout
      // strip the paths to npm/node/corepack in command
      .replace(
        /(?:[^" ]+?)(\/bin\/(node|npm|corepack)(?:\.exe|\.cmd)?)/g,
        '<path/to/>$1',
      )
      // strip the versions since it will change
      .replace(/midnight-smoker@\d+\.\d+\.\d+/, 'midnight-smoker@<version>')
      .replace(/midnight-smoker v\d+\.\d+\.\d+/, 'midnight-smoker v<version>')
      .replace(/--version\\n\\n\d+\.\d+\.\d+/, '--version\\n\\n<version>')
      // strip the path to `cli.js` since it differs per platform
      .replace(/node(\.exe)?\s+\S+?smoker\.js/, '<path/to/>smoker.js')
      .replace(/"cwd":\s+"[^"]+"/, '"cwd": "<cwd>"')
      .replace(
        /"tarballFilepath":\s+"[^"]+"/,
        '"tarballFilepath": "<tarball.tgz>"',
      )
      .replace(/"installPath":\s+"[^"]+"/, '"installPath": "<some/path>"')
  );
}
