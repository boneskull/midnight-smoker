/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import execa from 'execa';
import {ABORT} from 'midnight-smoker/constants';
import {AbortError, InvalidArgError} from 'midnight-smoker/error';
import {ExecError, type Executor, isExecaError} from 'midnight-smoker/executor';
import {constants as osConstants} from 'node:os';

export const systemExecutor: Executor = async (
  spec,
  args,
  opts = {},
  spawnOpts = {},
) => {
  const {signal, verbose} = opts;

  if (!spec.bin) {
    throw new InvalidArgError(
      'Non-system package manager spec passed to system executor; this is a bug.',
      {argName: 'spec', position: 0},
    );
  }

  if (signal?.aborted) {
    throw new AbortError(signal.reason);
  }

  const {bin} = spec;

  const proc = execa(bin, args, {
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
  }
};
