/**
 * Provides utilities for mocking the `execa` package.
 *
 * @remarks
 * For package managers which choose to use `execa`.
 * @packageDocumentation
 * @see {@link createExecaMock}
 */

import type {ExecaChildProcess, ExecaReturnValue, NodeOptions} from 'execa';

import {Readable} from 'node:stream';
import sinon from 'sinon';

/**
 * Represents a mock object for the {@link execa.node} function.
 */
export interface ExecaMock {
  node: sinon.SinonStub<[string, string[]?, NodeOptions?], ExecaChildProcess>;
}

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
 * Creates a mock for the {@link execa.node} function, which is
 * {@link ExecaMock an object} containing a {@link sinon.SinonStub}.
 *
 * This stub is useful for testing streams. It will emit a little bit of dummy
 * data. `stdout` will look like some JSON.
 *
 * @param readableMocks - Optional; mocks for the `stdout` and `stderr` streams.
 * @returns The `ExecaMock` object.
 */
export function createExecaMock(
  readableMocks: Partial<ReadableMocks> = {},
): ExecaMock {
  const stdout = (readableMocks.stdout =
    readableMocks.stdout ?? createReadableMock());
  const stderr = (readableMocks.stderr =
    readableMocks.stderr ?? createReadableMock());
  const node = sinon.stub().callsFake(
    // this function should _not_ be async for reasons
    (command: string, args: string[] = []): Promise<ExecaReturnValue> => {
      const promise = new Promise((resolve) => {
        setImmediate(() => {
          const retval = {
            all: '',
            command: `${command} ${args.join(' ')}`.trim(),
            exitCode: 0,
            failed: false,
            stderr: '',
            stdout: '',
          };
          stdout.on('data', (value) => {
            retval.stdout += value;
            retval.all += value;
          });
          stderr.on('data', (value) => {
            retval.stderr += value;
            retval.all += value;
          });
          stdout.emit('data', '[{"key": "<stdout from command>"}]\n');
          stderr.emit('data', '<stderr from command>\n');
          resolve(retval);
        });
      });
      void Object.assign(promise, {
        command: `${command} ${args.join(' ')}`.trim(),
        stderr,
        stdout,
      });
      return promise as ExecaChildProcess;
    },
  );
  return {node} as ExecaMock;
}
