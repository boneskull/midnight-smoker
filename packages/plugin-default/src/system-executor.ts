/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import {ABORT} from 'midnight-smoker/constants';
import {AbortError, InvalidArgError} from 'midnight-smoker/error';
import {type Executor} from 'midnight-smoker/executor';
import {exec} from 'midnight-smoker/util';
import {constants as osConstants} from 'node:os';

export const systemExecutor: Executor = async (spec, args, opts = {}) => {
  const {nodeOptions = {}, signal, verbose} = opts;

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

  const proc = exec(bin, args, {
    nodeOptions,
    signal,
    verbose,
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

  try {
    return await proc;
  } finally {
    if (signal) {
      signal.removeEventListener(ABORT, abortListener!);
    }
  }
};
