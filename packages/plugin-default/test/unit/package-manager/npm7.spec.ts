import {type ExecaError} from 'execa';
import {ErrorCodes} from 'midnight-smoker/error';
import {
  ExecError,
  type ExecResult,
  type Executor,
} from 'midnight-smoker/executor';
import {
  PkgManagerSpec,
  SemVer,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
} from 'midnight-smoker/pkg-manager';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type NpmPackItem} from '../../../src/package-manager/npm';
import type NPM7 from '../../../src/package-manager/npm7';
import type {ConsoleMock, DebugMock} from '../../mocks';
import {mockConsole, mockDebug} from '../../mocks';

const expect = unexpected.clone().use(unexpectedSinon);

const MOCK_TMPDIR = '/some/dir';

interface Npm7SpecMocks {
  'node:console': ConsoleMock;
  debug?: DebugMock;
}

describe('@midnight-smoker/plugin-default', function () {
  let sandbox: sinon.SinonSandbox;

  let mocks: Npm7SpecMocks;
  let result: ExecResult;
  let Npm7: typeof NPM7;
  let executor: sinon.SinonStubbedMember<Executor>;

  beforeEach(function () {
    sandbox = createSandbox();
    mocks = {
      'node:console': mockConsole,
      debug: mockDebug,
    };

    // sandbox.stub(Helpers, 'createTempDir').resolves(MOCK_TMPDIR);

    // don't stub out debug statements if running in wallaby
    if (process.env.WALLABY) {
      delete mocks.debug;
    }

    result = {
      stdout: '',
      stderr: '',
      command: '',
      exitCode: 0,
      failed: false,
    };
    executor = sandbox.stub().resolves(result) as typeof executor;

    Npm7 = rewiremock.proxy(
      () => require('../../../src/package-manager/npm7'),
      mocks,
    );
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('package manager', function () {
    describe('Npm7', function () {
      let spec: Readonly<PkgManagerSpec>;
      before(async function () {
        spec = await PkgManagerSpec.from('Npm7@7.0.0');
      });

      describe('method', function () {
        describe('accepts', function () {
          it('should return undefined for versions < 7.0.0', function () {
            expect(Npm7.accepts('6.0.0'), 'to be undefined');
          });

          it('should return a SemVer for versions >=7 & <9', function () {
            expect(Npm7.accepts('8.0.0'), 'to be a', SemVer);
          });

          it('should return undefined for versions >=9', function () {
            expect(Npm7.accepts('9.0.0'), 'to be undefined');
          });
        });

        describe('pack()', function () {
          const npmPackItems: NpmPackItem[] = [
            {
              name: 'tubby',
              filename: 'tubby-3.2.1.tgz',
              files: [],
            },
          ];
          let ctx: PkgManagerPackContext;

          beforeEach(function () {
            executor.resolves({
              stdout: JSON.stringify(npmPackItems),
            } as any);
            ctx = {
              workspaceInfo: [
                {
                  pkgName: 'foo',
                  localPath: '/some/path',
                  pkgJson: {},
                  pkgJsonPath: '/some/path/to/package.json',
                },
              ],
              pkgJson: {},
              pkgJsonPath: '/some/path/to/package.json',
              localPath: '/some/path',
              pkgName: 'foo',
              spec: spec.toJSON(),
              tmpdir: MOCK_TMPDIR,
              executor,
              signal: new AbortController().signal,
            };
          });

          describe('when called with a base context', function () {
            it('should call exec without extra flags', async function () {
              await Npm7.pack(ctx);

              expect(executor, 'to have a call satisfying', [
                spec,
                [
                  'pack',
                  '--json',
                  `--pack-destination=${MOCK_TMPDIR}`,
                  '--foreground-scripts=false',
                ],
              ]);
            });
          });

          describe('when Npm7 failed to spawn', function () {
            beforeEach(async function () {
              const execaError: ExecaError = {
                isCanceled: false,
                message: '',
                shortMessage: '',
                name: '',
                command: '',
                escapedCommand: '',
                exitCode: 0,
                stdout: JSON.stringify({
                  error: {
                    summary: 'foo',
                  },
                }),
                stderr: '',
                failed: false,
                timedOut: false,
                killed: false,
              };
              executor.rejects(new ExecError(execaError));
            });

            it('should reject', async function () {
              await expect(
                Npm7.pack(ctx),
                'to be rejected with error satisfying',
                {
                  code: ErrorCodes.PackError,
                },
              );
            });
          });

          describe(`when Npm7's stdout returns something other than a JSON string`, function () {
            beforeEach(function () {
              executor.resetBehavior();
              executor.resolves({stdout: '{not json}'} as any);
            });

            it('should reject', async function () {
              await expect(
                Npm7.pack(ctx),
                'to be rejected with error satisfying',
                {
                  code: ErrorCodes.PackParseError,
                },
              );
            });
          });

          describe('when packing is successful', function () {
            it('should resolve with an array of InstallManifest objects', async function () {
              await expect(
                Npm7.pack(ctx),
                'to be fulfilled with value satisfying',
                [
                  {
                    pkgSpec: `/some/dir/tubby-3.2.1.tgz`,
                    pkgName: 'tubby',
                    cwd: '/some/dir',
                  },
                ],
              );
            });
          });
        });

        describe('install()', function () {
          let ctx: PkgManagerInstallContext;

          beforeEach(function () {
            executor.resolves({stdout: 'stuff', exitCode: 0} as any);
            ctx = {
              workspaceInfo: [],
              spec: spec.toJSON(),
              tmpdir: MOCK_TMPDIR,
              executor,
              signal: new AbortController().signal,
              installManifest: {
                pkgSpec: `${MOCK_TMPDIR}/bar.tgz`,
                pkgName: 'bar',
                cwd: MOCK_TMPDIR,
                installPath: `${MOCK_TMPDIR}/node_modules/bar`,
              },
            };
          });

          describe('when Npm7 fails and outputs garbage', function () {
            const err = new ExecError({} as ExecaError);
            beforeEach(function () {
              executor.rejects(err);
            });

            it('should reject', async function () {
              await expect(
                Npm7.install(ctx),
                'to be rejected with error satisfying',
                {
                  code: ErrorCodes.InstallError,
                  cause: err,
                },
              );
            });
          });

          it('should call Npm7 with "--global-style"', async function () {
            await Npm7.install(ctx);
            expect(executor, 'to have a call satisfying', [
              spec,
              [
                'install',
                '--no-audit',
                '--no-package-lock',
                '--global-style',
                '--json',
                ctx.installManifest.pkgSpec,
              ],
              {},
              {cwd: '/some/dir'},
            ]);
          });

          describe('when "manifest" argument is empty', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error bad type
                Npm7.install({...ctx, installManifest: undefined}),
                'to be rejected with error satisfying',
                {code: ErrorCodes.InvalidArgError},
              );
            });
          });
        });

        describe('runScript()', function () {
          let ctx: PkgManagerRunScriptContext;

          beforeEach(function () {
            executor.resolves({failed: false, stdout: 'stuff'} as any);
            ctx = {
              workspaceInfo: [],
              signal: new AbortController().signal,
              spec: spec.toJSON(),
              executor,
              tmpdir: MOCK_TMPDIR,
              loose: false,
              manifest: {
                cwd: `${MOCK_TMPDIR}/node_modules/foo`,
                pkgName: 'foo',
                pkgJson: {},
                pkgJsonPath: '',
                script: 'some-script',
                localPath: '/some/path',
              },
            };
          });

          describe('when Npm7 fails', function () {
            beforeEach(function () {
              executor.rejects(new ExecError({} as ExecaError));
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                Npm7.runScript(ctx),
                'to be fulfilled with value satisfying',
                {
                  error: {code: ErrorCodes.RunScriptError},
                },
              );
            });
          });

          describe('when the script fails', function () {
            beforeEach(function () {
              executor.resolves({
                failed: true,
                all: 'reasons',
                exitCode: 1,
              } as any);
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                Npm7.runScript(ctx),
                'to be fulfilled with value satisfying',
                {
                  error: {
                    code: ErrorCodes.ScriptFailedError,
                    context: {exitCode: 1},
                  },
                },
              );
            });
          });

          describe('when the script was not found', function () {
            beforeEach(function () {
              executor.resolves({
                failed: true,
                stderr: 'missing script:',
              } as any);
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                Npm7.runScript(ctx),
                'to be fulfilled with value satisfying',
                {
                  error: {code: ErrorCodes.UnknownScriptError},
                },
              );
            });
          });

          describe('when the script succeeds', function () {
            it('should resolve with a result containing no error', async function () {
              await expect(
                Npm7.runScript(ctx),
                'to be fulfilled with value satisfying',
                expect.it('not to have key', 'error'),
              );
            });
          });
        });
      });
    });
  });
});
