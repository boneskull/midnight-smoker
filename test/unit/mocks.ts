import type {SemVer} from 'semver';
import type debug from 'debug';
import type which from 'which';
import type {NodeOptions, ExecaReturnValue} from 'execa';
import sinon from 'sinon';
import {Readable} from 'node:stream';
import type * as MS from '../../src';
import type {Executor} from '../../src/pm/executor';
export type WhichMock = sinon.SinonStubbedMember<typeof which>;
export type ExecaMock = {
  node: sinon.SinonStub<
    [string, string[]?, NodeOptions?],
    Promise<Partial<ExecaReturnValue>>
  >;
};
export type ConsoleMock = sinon.SinonStubbedInstance<typeof console>;
export type DebugMock = sinon.SinonStubbedMember<typeof debug>;

export function createReadableMock() {
  return sinon.createStubInstance(Readable);
}

export type ReadableMocks = {
  stdout: sinon.SinonStubbedInstance<Readable>;
  stderr: sinon.SinonStubbedInstance<Readable>;
};

export function createExecaMock(
  readableMocks: Partial<ReadableMocks> = {},
): ExecaMock {
  const stdout = (readableMocks.stdout =
    readableMocks.stdout ?? createReadableMock());
  const stderr = (readableMocks.stderr =
    readableMocks.stderr ?? createReadableMock());
  const stdoutData = JSON.stringify([{filename: 'tarball.tgz', name: 'bar'}]);
  const node = sinon
    .stub()
    .callsFake(
      (command: string, args: string[] = [], opts: NodeOptions = {}) => {
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
        Object.assign(promise, {
          stdout,
          stderr,
          command: `${command} ${args.join(' ')}`.trim(),
        });
        return promise;
      },
    );
  return {node} as ExecaMock;
}
export class NullPm implements MS.PackageManager {
  constructor(
    public executor: Executor,
    public opts: MS.PackageManagerOpts = {},
  ) {}
  public readonly name = 'nullpm';

  public readonly path = '/usr/bin/nullpm';

  public async getBinPath(): Promise<string> {
    return this.path;
  }
  public async getVersion(): Promise<string> {
    return '5.0.0';
  }
  public async install(
    manifest: MS.InstallManifest,
    opts?: MS.InstallOpts | undefined,
  ): Promise<MS.InstallResult> {
    return {
      stdout: '',
      stderr: '',
      command: '',
      exitCode: 0,
    };
  }

  public async pack(
    dest: string,
    opts?: MS.PackOpts | undefined,
  ): Promise<MS.InstallManifest> {
    return {
      packedPkgs: [
        {
          tarballFilepath: `${dest}/bar.tgz`,
          installPath: `${dest}/node_modules/bar`,
          pkgName: 'bar',
        },
        {
          tarballFilepath: `${dest}/baz.tgz`,
          installPath: `${dest}/node_modules/baz`,
          pkgName: 'baz',
        },
      ],
      tarballRootDir: dest,
    };
  }

  public async runScript(
    runManifest: MS.RunManifest,
    opts?: MS.RunScriptOpts | undefined,
  ): Promise<MS.RunScriptResult> {
    return {
      pkgName: runManifest.packedPkg.pkgName,
      script: runManifest.script,
      rawResult: {
        stdout: '',
        stderr: '',
        command: '',
        exitCode: 0,
        failed: false,
      },
      cwd: '',
    };
  }
}

export const nullPmModule: MS.PackageManagerModule = {
  bin: 'nullpm',
  load(executor: Executor, opts?: MS.PackageManagerOpts) {
    return new NullPm(executor, opts);
  },
  accepts(semver: SemVer): boolean {
    return semver.compare('2.0.0') <= 0;
  },
};
