/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import {node as execa} from 'execa';
import type {Executor} from 'midnight-smoker/plugin';
import {Errors, Helpers} from 'midnight-smoker/plugin';
import path from 'node:path';

/**
 * Disables the strict `packageManager` field in `package.json`.
 *
 * If this field was enabled, then `corepack` would not arbitrarily run
 * user-requested package manager & version pairs.
 */
const DEFAULT_ENV = {
  COREPACK_ENABLE_PROJECT_SPEC: '0',
} as const;

const COREPACK_PATH = path.resolve(
  path.dirname(require.resolve('corepack/package.json')),
  '..',
  '.bin',
  'corepack',
);

async function exec(
  spec: string,
  args: string[],
  opts: Executor.ExecutorOpts = {},
  spawnOpts: Executor.SpawnOpts = {},
): Promise<Executor.ExecResult> {
  const {verbose, signal} = opts;

  if (signal?.aborted) {
    // stuff and things
  }

  const proc = execa(COREPACK_PATH, [spec, ...args], {
    env: {...DEFAULT_ENV, ...spawnOpts.env},
    ...spawnOpts,
  });

  if (signal) {
    signal.addEventListener('abort', () => {
      proc.kill();
    });
  }

  if (verbose) {
    proc.stdout?.pipe(process.stdout);
    proc.stderr?.pipe(process.stderr);
  }

  try {
    return await proc;
  } catch (err) {
    throw Helpers.isExecaError(err) ? new Errors.ExecError(err) : err;
  }
}

export const smokerExecutor: Executor.Executor = exec;
