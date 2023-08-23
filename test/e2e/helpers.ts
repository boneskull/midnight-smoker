/**
 * E2E test harness helpers
 * @module
 */
import createDebug from 'debug';
import {node as execa, type NodeOptions} from 'execa';
import path from 'node:path';
import {inspect} from 'node:util';
import type {RawRunScriptResult} from '../../src';
const debug = createDebug('midnight-smoker:test:e2e');

/**
 * Matches any absolute path, leaving the last path segment intact
 */
const ABS_PATH_REGEX =
  /(\/([^\0 !$`&*()+]|\/|\(|!|\$|`|&|\*|\(|\)|\+\))+(\/))/g;

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
): Promise<RawRunScriptResult> {
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
  let result = stdout.replaceAll(ABS_PATH_REGEX, '');
  if (stripPmVersions) {
    result = result.replace(
      /(npm|yarn|pnpm|midnight-smoker)@\d+\.\d+\.\d+/g,
      '$1@<version>',
    );
  }

  return result;
}
