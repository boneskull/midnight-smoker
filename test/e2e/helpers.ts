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
