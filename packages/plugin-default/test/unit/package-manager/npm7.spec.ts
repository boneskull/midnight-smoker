import stringify from 'json-stable-stringify';
import {type ExecOutput} from 'midnight-smoker';
import {type Executor} from 'midnight-smoker/defs/executor';
import {ErrorCode, ExecError} from 'midnight-smoker/error';
import {
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  PkgManagerSpec,
  type StaticPkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import path from 'node:path';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

import {type NpmPackItem} from '../../../src/package-manager/npm';
import {Npm7} from '../../../src/package-manager/npm7';

const expect = unexpected.clone().use(unexpectedSinon);

const MOCK_TMPDIR = '/some/dir';

describe('@midnight-smoker/plugin-default', function () {
  let sandbox: sinon.SinonSandbox;

  let result: ExecOutput;
  let executor: sinon.SinonStubbedMember<Executor>;

  beforeEach(function () {
    sandbox = createSandbox();

    result = {
      command: '',
      cwd: '',
      exitCode: 0,
      stderr: '',
      stdout: '',
    };
    executor = sandbox.stub().resolves(result) as typeof executor;
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('package manager', function () {
    describe('Npm7', function () {
      let spec: StaticPkgManagerSpec;

      before(function () {
        spec = PkgManagerSpec.create('npm@7.0.0').toJSON();
      });

      describe('method', function () {
        describe('pack()', function () {
          const npmPackItems: NpmPackItem[] = [
            {
              filename: 'tubby-3.2.1.tgz',
              files: [],
              name: 'tubby',
            },
          ];
          let ctx: PkgManagerPackContext;

          beforeEach(function () {
            executor.resolves({
              stdout: JSON.stringify(npmPackItems),
            } as any);
            ctx = {
              executor,
              localPath: '/some/path',
              pkgJson: {name: 'foo', version: '1.0.0'},
              pkgJsonPath: '/some/path/to/package.json',
              pkgJsonSource: stringify({name: 'foo', version: '1.0.0'}),
              pkgName: 'foo',
              signal: new AbortController().signal,
              spec,
              tmpdir: MOCK_TMPDIR,
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
                {
                  nodeOptions: {signal: expect.it('to be an', AbortSignal)},
                  verbose: undefined,
                },
              ]);
            });
          });

          describe('when Npm7 failed to spawn', function () {
            beforeEach(async function () {
              const output: ExecOutput = {
                command: '',
                cwd: '',
                exitCode: 0,
                stderr: '',
                stdout: JSON.stringify({
                  error: {
                    summary: 'foo',
                  },
                }),
              };
              executor.resetBehavior();
              executor.rejects(new ExecError('oops', output));
            });

            it('should reject', async function () {
              await expect(
                Npm7.pack(ctx),
                'to be rejected with error satisfying',
                {
                  code: ErrorCode.PackError,
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
                  code: ErrorCode.PackParseError,
                },
              );
            });
          });

          describe('when packing is successful', function () {
            it('should resolve with an array of InstallManifest objects', async function () {
              await expect(
                Npm7.pack(ctx),
                'to be fulfilled with value satisfying',
                {
                  cwd: '/some/dir',
                  pkgName: 'tubby',
                  pkgSpec: path.normalize(`/some/dir/tubby-3.2.1.tgz`),
                },
              );
            });
          });
        });

        describe('install()', function () {
          let ctx: PkgManagerInstallContext;

          beforeEach(function () {
            executor.resolves({exitCode: 0, stdout: 'stuff'} as any);
            ctx = {
              executor,
              installManifest: {
                cwd: MOCK_TMPDIR,
                installPath: path.normalize(`${MOCK_TMPDIR}/node_modules/bar`),
                pkgName: 'bar',
                pkgSpec: path.normalize(`${MOCK_TMPDIR}/bar.tgz`),
              },
              signal: new AbortController().signal,
              spec,
              tmpdir: MOCK_TMPDIR,
            };
          });

          describe('when Npm7 fails and outputs garbage', function () {
            const err = new ExecError('oops', {
              command: '',
              cwd: '',
              exitCode: 0,
              stderr: '',
              stdout: '',
            });

            beforeEach(function () {
              executor.rejects(err);
            });

            it('should reject', async function () {
              await expect(
                Npm7.install(ctx),
                'to be rejected with error satisfying',
                {
                  cause: {
                    code: ErrorCode.ExecError,
                  },
                  code: ErrorCode.InstallError,
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
                ctx.installManifest.pkgSpec,
                '--no-audit',
                '--no-package-lock',
                '--global-style',
                '--json',
              ],
              {nodeOptions: {cwd: '/some/dir'}},
            ]);
          });

          describe('when "manifest" argument is empty', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error bad type
                Npm7.install({...ctx, installManifest: undefined}),
                'to be rejected',
              );
            });
          });
        });

        describe('runScript()', function () {
          let ctx: PkgManagerRunScriptContext;

          beforeEach(function () {
            executor.resolves({failed: false, stdout: 'stuff'} as any);
            ctx = {
              executor,
              loose: false,
              manifest: {
                cwd: path.normalize(`${MOCK_TMPDIR}/node_modules/foo`),
                localPath: '/some/path',
                pkgJson: {name: 'foo', version: '1.0.0'},
                pkgJsonPath: '',
                pkgJsonSource: stringify({name: 'foo', version: '1.0.0'}),
                pkgName: 'foo',
                script: 'some-script',
              },
              signal: new AbortController().signal,
              spec,
              tmpdir: MOCK_TMPDIR,
            };
          });

          describe('when Npm7 fails', function () {
            beforeEach(function () {
              executor.rejects(
                new ExecError('some error', {
                  stderr: 'some error',
                } as ExecOutput),
              );
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                Npm7.runScript(ctx),
                'to be fulfilled with value satisfying',
                {
                  error: {code: ErrorCode.RunScriptError},
                },
              );
            });
          });

          describe('when the script fails', function () {
            beforeEach(function () {
              const result: ExecOutput = {
                command: '',
                cwd: '',
                exitCode: 1,
                stderr: '',
                stdout: '',
              };
              executor.resolves(result);
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                Npm7.runScript(ctx),
                'to be fulfilled with value satisfying',
                {
                  error: {
                    code: ErrorCode.ScriptFailedError,
                    context: {exitCode: 1},
                  },
                },
              );
            });
          });

          describe('when the script was not found', function () {
            beforeEach(function () {
              const result: ExecOutput = {
                command: '',
                cwd: '',
                exitCode: 1,
                stderr: 'missing script: some-script',
                stdout: '',
              };
              executor.resolves(result);
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                Npm7.runScript(ctx),
                'to be fulfilled with value satisfying',
                {
                  error: {code: ErrorCode.UnknownScriptError},
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
