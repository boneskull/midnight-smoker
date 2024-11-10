/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import {AbortError, InvalidArgError} from 'midnight-smoker/error';
import {type Executor} from 'midnight-smoker/executor';
import {exec} from 'midnight-smoker/util';

export const systemExecutor: Executor = async (spec, args, opts = {}) => {
  const {nodeOptions = {}, verbose} = opts;

  if (!spec.bin) {
    throw new InvalidArgError(
      'Non-system package manager spec passed to system executor',
      {argName: 'spec', position: 0},
    );
  }

  if (nodeOptions.signal?.aborted) {
    throw new AbortError(nodeOptions.signal.reason);
  }

  const {bin} = spec;

  return exec(bin, args, {
    nodeOptions,
    verbose,
  });
};
