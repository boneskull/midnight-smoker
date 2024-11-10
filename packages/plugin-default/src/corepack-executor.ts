/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import {defaultsDeep} from 'lodash';
import {constant} from 'midnight-smoker/constants';
import {AbortError} from 'midnight-smoker/error';
import {type Executor} from 'midnight-smoker/executor';
import {exec} from 'midnight-smoker/util';
import {type SpawnOptions} from 'node:child_process';
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

export const corepackExecutor: Executor = async (spec, args, opts = {}) => {
  const {nodeOptions = {}, verbose} = opts;

  if (nodeOptions.signal?.aborted) {
    throw new AbortError(nodeOptions.signal.reason);
  }

  return exec(COREPACK_PATH, [spec.label, ...args], {
    nodeOptions: defaultsDeep(
      {...nodeOptions},
      {env: DEFAULT_ENV},
    ) as SpawnOptions,
    verbose,
  });
};
