/**
 * Provides a mock `ExecFn` for testing
 *
 * @packageDocumentation
 * @see {@link createExecMock}
 */
import stringify from 'json-stable-stringify';
import {
  type ExecFn,
  type ExecOptions,
  type ExecOutput,
  type ExecResult,
} from 'midnight-smoker/schema';
import {NL} from 'midnight-smoker/util';
import {Readable} from 'node:stream';
import sinon from 'sinon';

export type ExecMock = ExecFn & sinon.SinonStubbedMember<ExecFn>;

/**
 * Creates a mock instance of a {@link Readable}
 *
 * @returns The readable mock instance.
 */
export function createReadableMock() {
  return sinon.createStubInstance(Readable);
}

export interface ReadableMocks {
  stderr: sinon.SinonStubbedInstance<Readable>;
  stdout: sinon.SinonStubbedInstance<Readable>;
}

/**
 * Creates a mock for `midnight-smoker`'s `exec` function.
 *
 * This stub is useful for testing streams. It will emit a little bit of dummy
 * data. `stdout` will look like some JSON.
 *
 * @param readableMocks - Optional; mocks for the `stdout` and `stderr` streams.
 * @returns The `ExecMock` object.
 */
export function createExecMock(
  readableMocks: Partial<ReadableMocks> = {},
): ExecMock {
  const stdout = (readableMocks.stdout =
    readableMocks.stdout ?? createReadableMock());
  const stderr = (readableMocks.stderr =
    readableMocks.stderr ?? createReadableMock());
  const exec = sinon.stub().callsFake(
    // this function should _not_ be async for reasons
    (
      command: string,
      args: string[] = [],
      options: ExecOptions = {},
    ): ExecResult => {
      const promise: ExecResult = new Promise((resolve) => {
        setImmediate(() => {
          const stdoutValue = stringify({key: 'value'});
          const stderrValue = 'stderr';
          const retval: ExecOutput = {
            command: `${command} ${args.join(' ')}`.trim(),
            cwd: `${options?.nodeOptions?.cwd ?? '/some/path'}`,
            exitCode: 0,
            stderr: 'stderr',
            stdout: stdoutValue,
          };
          stdout.on('data', (value) => {
            retval.stdout += value;
          });
          stderr.on('data', (value) => {
            retval.stderr += value;
          });
          stdout.emit('data', `${stdoutValue}${NL}`);
          stderr.emit('data', `${stderrValue}${NL}`);
          resolve(retval);
        });
      });
      void Object.assign(promise, {
        process: {
          stderr,
          stdout,
        },
      });
      return promise;
    },
  );
  return exec as ExecMock;
}
