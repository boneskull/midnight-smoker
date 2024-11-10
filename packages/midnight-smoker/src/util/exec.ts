/**
 * Provides a default {@link exec} implementation based on
 * {@link https://npm.im/tinyexec tinyexec} for executing shell commands.
 *
 * @packageDocumentation
 */
import {constant} from '#constants';
import {AbortError} from '#error/abort-error';
import {SpawnError} from '#error/spawn-error';
import {ExecError} from '#executor';
import {
  type ExecFn,
  type ExecOptions,
  type ExecOutput,
  type SpawnHook,
} from '#schema/exec-output';
import * as assert from '#util/assert';
import {createDebug} from '#util/debug';
import {fromUnknownError} from '#util/from-unknown-error';
import {cyanBright, yellow} from 'chalk';
import {isError, isObject, noop} from 'lodash';
import {type ChildProcess, spawn, type SpawnOptions} from 'node:child_process';
import {once} from 'node:events';
import {finished} from 'node:stream/promises';

import {isErrnoException} from './guard';
import {registerChildProcess} from './preamble';

const debug = createDebug(__filename);

/**
 * Default options for {@link exec}
 */
const DEFAULT_EXEC_OPTIONS = constant({
  nodeOptions: {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DEBUG: '', // prevent DEBUG from being inherited
    },
  },
  onSpawn: noop,
  timeout: 30_000,
  trim: true,
}) satisfies ExecOptions;

/**
 * Reads a readable stream until it ends and returns its output
 *
 * @param stream Readable stream
 * @returns Output
 */
const consume = async (
  stream: NodeJS.ReadableStream,
  verboseStream?: NodeJS.WritableStream,
) => {
  let output = '';
  for await (const buf of stream) {
    const data = `${buf}`;
    output += data;
    verboseStream?.write(data);
  }
  return output;
};

/**
 * Waits for the child process to emit `spawn`
 */
const spawned = async (proc: ChildProcess): Promise<ChildProcess> => {
  await once(proc, 'spawn');
  return proc;
};

/**
 * Waits for the child process to exit and returns its exit code
 *
 * We eat the signal cause we don't care (yet)
 *
 * @returns Exit code
 */
const exited = async (proc: ChildProcess): Promise<number> => {
  return (once(proc, 'exit') as Promise<[exitCode: number]>).then(
    ([code]) => code || 0,
  );
};

/**
 * Waits for the child process to emit an `error` event
 *
 * If this is emitted, it won't emit `spawn`
 *
 * @returns Never, because it only rejects
 */
const errored = async (proc: ChildProcess): Promise<never> => {
  const [err] = (await once(proc, 'error')) as [NodeJS.ErrnoException];
  if (err.code === 'ABORT_ERR') {
    throw new AbortError(err.message);
  }
  throw err;
};

const wrapSpawnHook = (onSpawn: SpawnHook) => {
  return async (proc: ChildProcess, signal: AbortSignal) => {
    try {
      // TODO: can be Promise.try in the future
      await new Promise((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
        resolve(onSpawn(proc, signal));
      });
    } catch (err) {
      throw fromUnknownError(err);
    }
  };
};

/**
 * The main function used for executing shell commands.
 *
 * This should be consumed by all `Executor` implementations.
 *
 * @param command Command name (optionally with path) to execute
 * @param argsOrOptions Args for command or options
 * @param options Options
 * @returns An {@link ExecOutput} object
 */
export const exec: ExecFn = async (
  command,
  argsOrOptions?: ExecOptions | string[],
  options?: ExecOptions,
) => {
  let args: string[] = [];
  if (Array.isArray(argsOrOptions)) {
    args = argsOrOptions;
  } else if (argsOrOptions) {
    options = argsOrOptions;
  }

  /**
   * @param err Some error
   * @returns
   */
  const handleError = (err: unknown) => {
    if (err === timeoutSignal.reason) {
      return new AbortError(
        `Command timed out after ${timeout}ms in ${cwd}: ${formattedCommand}`,
        err as Error,
      );
    }
    if (err && isError(err)) {
      if (isErrnoException(err)) {
        if (err.code === 'ABORT_ERR') {
          if (
            'cause' in err &&
            isObject(err.cause) &&
            'name' in err.cause &&
            err.cause.name === 'TimeoutError'
          ) {
            return new AbortError(
              `Command timed out after ${timeout}ms in ${cwd}: ${formattedCommand}`,
            );
          }
          return new AbortError(
            `Command aborted in ${cwd}: ${formattedCommand}`,
            err,
          );
        }
        return new SpawnError(
          `Command failed to spawn: ${formattedCommand}`,
          fromUnknownError(err),
        );
      }
    }
  };

  /**
   * Returns `true` if one of the signals was aborted
   *
   * @returns `true` if one of the signals was aborted
   */
  const didAbort = (): boolean => {
    // check timeoutSignal first, because `signal` may be a composite signal
    if (timeoutSignal.aborted) {
      reject(handleError(timeoutSignal.reason));
      return true;
    }

    if (signal.aborted) {
      reject(handleError(signal.reason));
      return true;
    }
    return false;
  };

  /**
   * For returning in the {@link ExecOutput}
   */
  const formattedCommand = [command, ...args].join(' ');

  const {nodeOptions, onSpawn, timeout, trim, verbose} = {
    ...DEFAULT_EXEC_OPTIONS,
    ...options,
  };

  // for empty string
  const cwd = `${nodeOptions.cwd || DEFAULT_EXEC_OPTIONS.nodeOptions.cwd}`;

  // we will always timeout at minimum of 30s (see DEFAULT_EXEC_OPTIONS)
  const timeoutSignal = AbortSignal.timeout(timeout);

  // if we received a signal, we can compose it with the timeout signal
  const signal =
    'signal' in nodeOptions && nodeOptions.signal
      ? AbortSignal.any([nodeOptions.signal, timeoutSignal])
      : timeoutSignal;

  let resolve!: (output: ExecOutput) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<ExecOutput>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  debug('Spawning: %s in %s', yellow(formattedCommand), cyanBright(cwd));

  const spawnOptions: SpawnOptions = {
    ...nodeOptions,
    signal,
  };
  const proc = spawn(command, args, spawnOptions);

  let verboseStderr: NodeJS.WritableStream | undefined;
  let verboseStdout: NodeJS.WritableStream | undefined;
  if (verbose) {
    [verboseStdout, verboseStderr] = [process.stdout, process.stderr];
  }

  const {stderr: childStderr, stdout: childStdout} = proc;
  assert.ok(childStderr, `Child process' "stderr" is not a stream`);
  assert.ok(childStdout, `Child process' "stdout" is not a stream`);

  // try to spawn the process. if it emits `error`, then spawning failed,
  // and we will reject.
  try {
    await Promise.race([errored(proc), spawned(proc)]);
  } catch (err) {
    reject(handleError(err));
    return promise;
  }

  if (didAbort()) {
    return promise;
  }

  const spawnHook = wrapSpawnHook(onSpawn);
  try {
    await spawnHook(proc, signal);
  } catch (err) {
    reject(fromUnknownError(err, true));
    return promise;
  }

  if (didAbort()) {
    return promise;
  }

  try {
    await using _ = registerChildProcess(proc);

    // consume for all of the stream output, wait for the streams to close, and
    // wait for exit event
    const [stdout, stderr, exitCode] = await Promise.all([
      consume(childStdout, verboseStdout),
      consume(childStderr, verboseStderr),
      exited(proc),
      finished(childStdout),
      finished(childStderr),
    ]);

    const execOutput: ExecOutput = {
      command: formattedCommand,
      cwd,
      exitCode,
      stderr: trim ? stderr.trim() : stderr,
      stdout: trim ? stdout.trim() : stdout,
    };

    if (exitCode) {
      reject(
        new ExecError(
          `Command failed in ${cwd}: ${formattedCommand}`,
          execOutput,
        ),
      );
    }

    resolve(execOutput);
  } catch (err) {
    reject(handleError(err));
  }

  return promise;
};
