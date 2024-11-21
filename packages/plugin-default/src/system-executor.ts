/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import {type Executor} from 'midnight-smoker/defs/executor';
import {InvalidArgError} from 'midnight-smoker/error';
import {exec} from 'midnight-smoker/util';

export const systemExecutor: Executor = async (spec, args, opts = {}) => {
  const {nodeOptions = {}, verbose} = opts;

  if (!spec.bin) {
    throw new InvalidArgError(
      'Non-system package manager spec passed to system executor',
      {argName: 'spec', position: 0},
    );
  }

  const {bin} = spec;

  return exec(bin, args, {
    nodeOptions,
    verbose,
  });
};
