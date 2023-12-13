/* eslint-disable @typescript-eslint/no-unused-vars */
import type {ExecaChildProcess, ExecaReturnValue, NodeOptions} from 'execa';
import {Readable} from 'node:stream';
import sinon from 'sinon';

/**
 * Represents a mock object for the `execa` function.
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
  stdout: sinon.SinonStubbedInstance<Readable>;
  stderr: sinon.SinonStubbedInstance<Readable>;
}

/**
 * Creates a mock for the `execa` package, containing the `node` function.
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
  const stdoutData = JSON.stringify([{filename: 'tarball.tgz', name: 'bar'}]);
  const node = sinon.stub().callsFake(
    // this function should _not_ be async for reasons
    (
      command: string,
      args: string[] = [],
      opts: NodeOptions = {},
    ): Promise<ExecaReturnValue> => {
      const promise = new Promise((resolve) => {
        setImmediate(() => {
          stdout.emit('data', 'output from npm');
          stderr.emit('data', 'error from npm');
          resolve({
            exitCode: 0,
            stdout: stdoutData,
            stderr: '',
            all: '',
            failed: false,
            command: `${command} ${args.join(' ')}`.trim(),
          });
        });
      });
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      Object.assign(promise, {
        stdout,
        stderr,
        command: `${command} ${args.join(' ')}`.trim(),
      });
      return promise as ExecaChildProcess;
    },
  );
  return {node} as ExecaMock;
}
