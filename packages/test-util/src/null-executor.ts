import type {Executor} from 'midnight-smoker/plugin';
import {createExecaMock} from './execa';

const execaMock = createExecaMock();

/**
 * Executes a command using a "null" executor which does nothing.
 */
export const nullExecutor: Executor.Executor = async function exec(
  spec,
  args,
  execOpts = {},
  spawnOpts = {},
): Promise<Executor.ExecResult> {
  const proc = execaMock.node(
    '/mock/thing',
    [spec.pkgManager, ...args],
    spawnOpts,
  );

  if (execOpts.verbose) {
    proc.stdout?.pipe(process.stdout);
    proc.stderr?.pipe(process.stderr);
  }

  return await proc;
};
