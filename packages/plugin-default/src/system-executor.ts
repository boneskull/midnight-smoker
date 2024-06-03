/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import execa from 'execa';
import {InvalidArgError} from 'midnight-smoker/error';
import {ExecError, isExecaError, type Executor} from 'midnight-smoker/executor';

export const systemExecutor: Executor = async (
  spec,
  args,
  opts = {},
  spawnOpts = {},
) => {
  const {verbose, signal} = opts;

  if (!spec.isSystem) {
    throw new InvalidArgError(
      'Non-system package manager spec passed to system executor; this is a bug.',
      {argName: 'spec', position: 0},
    );
  }

  if (signal?.aborted) {
    // stuff and things
  }

  const {bin} = spec;

  const proc = execa(bin, args, {
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
    throw isExecaError(err) ? new ExecError(err) : err;
  }
};
