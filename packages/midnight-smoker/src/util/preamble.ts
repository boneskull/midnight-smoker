/**
 * Provides {@link init} which ensures all active child processes are killed upon
 * exit.
 */
import {createDebug} from '#util/debug';
import {type ChildProcess} from 'node:child_process';
import {once as onlyOnce} from 'remeda';
import terminate_ from 'terminate/promise';

/**
 * Registry of child processes indexed by pid
 */
export const childProcesses: Map<number, RegisteredChildProcess> = new Map();

export class RegisteredChildProcess implements AsyncDisposable {
  public constructor(public readonly proc: ChildProcess) {}

  public async [Symbol.asyncDispose](): Promise<void> {
    await Promise.resolve();
    const {proc} = this;
    const {pid} = this.proc;
    if (pid) {
      debug('Disposing child process w/ pid %s', pid);
      childProcesses.delete(pid);
      // a timeout may kill the process already, but this should
      // force it to die.
      // it's unclear to me what it means if `killed` is true and `signalCode` is `null`
      if ((proc.exitCode === undefined || proc.exitCode === null) && proc.pid) {
        return this.terminate();
      }
    }
  }

  public async terminate(): Promise<void> {
    await Promise.resolve();
    if (
      (this.proc.exitCode === undefined || this.proc.exitCode === null) &&
      this.proc.pid &&
      !this.proc.killed
    ) {
      await terminate_(this.proc.pid);
    }
  }
}

export const debug = createDebug(__filename);

export const registerChildProcess = (
  proc: ChildProcess,
): RegisteredChildProcess => {
  if (!proc.pid) {
    throw new TypeError('Child process must spawned (needs a pid)');
  }
  const {pid} = proc;

  if (childProcesses.has(pid)) {
    return childProcesses.get(pid)!;
  }
  const registered: RegisteredChildProcess = new RegisteredChildProcess(proc);
  childProcesses.set(proc.pid, registered);

  return registered;
};

export const getChildProcesses = (): RegisteredChildProcess[] => [
  ...childProcesses.values(),
];

export const reset = (): void => {
  childProcesses.clear();
};

/**
 * Expected to be called by the `process` module with its set of registered
 * `ChildProcess` instances.
 */
const init = onlyOnce((): void => {
  if (
    !process.listeners('beforeExit').includes(midnightSmokerBeforeExitListener)
  ) {
    process.once('beforeExit', midnightSmokerBeforeExitListener);
  }

  if (!process.listeners('exit').includes(midnightSmokerExitListener)) {
    process.once('exit', midnightSmokerExitListener);
  }

  function midnightSmokerExitListener() {
    for (const [, {proc}] of childProcesses) {
      proc.kill() || proc.kill('SIGKILL');
    }
  }

  function midnightSmokerBeforeExitListener() {
    for (const [pid, registered] of childProcesses) {
      void registered[Symbol.asyncDispose]().then(
        () => {
          debug(`beforeExit: Terminated child process ${pid}`);
        },
        (err) => {
          console.error(
            `Failed to terminate child process ${pid}: ${err}\nYou should probably kill it manually.`,
          );
        },
      );
    }
  }
});

init();
