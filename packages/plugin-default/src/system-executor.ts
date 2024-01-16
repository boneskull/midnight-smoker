/**
 * Implementation of the {@link Executor} interface for `corepack`.
 *
 * @packageDocumentation
 */

import {node as execa} from 'execa';
import {
  Errors,
  Executor,
  Helpers,
  type PkgManager,
} from 'midnight-smoker/plugin';

async function exec(
  spec: PkgManager.PkgManagerSpec,
  args: string[],
  opts: Executor.ExecutorOpts = {},
  spawnOpts: Executor.SpawnOpts = {},
): Promise<Executor.ExecResult> {
  const {verbose, signal} = opts;

  if (!spec.isSystem) {
    throw new Errors.InvalidArgError(
      'Non-system package manager spec passed to system executor; this is a bug.',
      {argName: 'spec', position: 0},
    );
  }

  if (signal?.aborted) {
    // stuff and things
  }

  const {pkgManager: bin} = spec;

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
    throw Helpers.isExecaError(err) ? new Executor.ExecError(err) : err;
  }
}

export const systemExecutor: Executor.Executor = exec;
