/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import {node as execa} from 'execa';
import {ABORT, constant} from 'midnight-smoker/constants';
import {AbortError} from 'midnight-smoker/error';
import {ExecError, type Executor, isExecaError} from 'midnight-smoker/executor';
import {constants as osConstants} from 'node:os';
import path from 'node:path';

/**
 * Disables the strict `packageManager` field in `package.json`.
 *
 * If `COREPACK_ENABLE_PROJECT_SPEC` was enabled, then `corepack` would not
 * arbitrarily run user-requested package manager & version pairs.
 *
 * If `COREPACK_ENABLE_AUTO_PIN` was enabled, then `corepack` would try to write
 * to `package.json`.
 */
const DEFAULT_ENV = constant({
  COREPACK_ENABLE_AUTO_PIN: '0',
  COREPACK_ENABLE_PROJECT_SPEC: '0',
});

const COREPACK_PATH = path.resolve(
  path.dirname(require.resolve('corepack/package.json')),
  '..',
  '.bin',
  'corepack',
);

export const corepackExecutor: Executor = async (
  spec,
  args,
  opts = {},
  spawnOpts = {},
) => {
  const {signal, verbose} = opts;

  if (signal?.aborted) {
    throw new AbortError(signal.reason);
  }

  const proc = execa(COREPACK_PATH, [spec.label, ...args], {
    env: {...DEFAULT_ENV, ...spawnOpts.env},
    ...spawnOpts,
  });

  let abortListener: (() => void) | undefined = undefined;
  if (signal) {
    abortListener = () => {
      if (!proc.kill()) {
        // screw 'em
        proc.kill(osConstants.signals.SIGKILL);
      }
    };
    signal.addEventListener(ABORT, abortListener);
  }

  if (verbose) {
    proc.stdout?.pipe(process.stdout);
    proc.stderr?.pipe(process.stderr);
  }

  try {
    return await proc;
  } catch (err) {
    throw isExecaError(err) ? new ExecError(err) : err;
  } finally {
    if (signal && abortListener) {
      signal.removeEventListener(ABORT, abortListener);
    }
  }
};
