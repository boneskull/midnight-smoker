import type {nullExecutor} from '@midnight-smoker/test-util';
import {type ExecaError} from 'execa';
import {Executor, Helpers, PkgManager as PkgMgr} from 'midnight-smoker/plugin';
import rewiremock from 'rewiremock/node';
import {Range} from 'semver';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {type NpmPackItem} from '../../../src/package-manager/npm';
import type * as NPM7 from '../../../src/package-manager/npm7';
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

  let Npm7: typeof NPM7.Npm7;
  let executor: sinon.SinonStubbedMember<typeof nullExecutor> &
    typeof nullExecutor;

  beforeEach(function () {
    sandbox = createSandbox();
    mocks = {
      'node:console': mockConsole,
      debug: mockDebug,
    };

    sandbox.stub(Helpers, 'createTempDir').resolves(MOCK_TMPDIR);

    // don't stub out debug statements if running in wallaby
    if (process.env.WALLABY_PROJECT_DIR) {
      delete mocks.debug;
    }

    executor = sandbox.stub() as typeof executor;

    ({Npm7} = rewiremock.proxy(
      () => require('../../../src/package-manager/npm7'),
      mocks,
    ));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('package manager', function () {
    describe('Npm7', function () {
      let spec: Readonly<PkgMgr.PkgManagerSpec>;
      before(async function () {
        spec = await PkgMgr.PkgManagerSpec.from('npm@7.0.0');
      });

      describe('static method', function () {
        describe('create()', function () {
          it('should resolve w/ an Npm instance', async function () {
            await expect(
              Npm7.create(spec, executor, Helpers),
              'to be fulfilled with value satisfying',
              expect.it('to be a', Npm7),
            );
          });
        });

        describe('accepts', function () {
          let range: Range;

          beforeEach(function () {
            range = new Range(Npm7.accepts);
          });

          it('should return false for versions < 7.0.0', function () {
            expect(range.test('6.0.0'), 'to be false');
          });

          it('should return true for versions >=7 & <9', function () {
            expect(range.test('8.0.0'), 'to be true');
          });

          it('should return false for versions >=9', function () {
            expect(range.test('9.0.0'), 'to be false');
          });
        });
      });

      describe('constructor', function () {
        describe('when provided no options', function () {
          it('should throw', function () {
            // @ts-expect-error bad args
            expect(() => new Npm7(), 'not to throw');
          });
        });
      });

      describe('method', function () {
        let npm: NPM7.Npm7;

        beforeEach(async function () {
          npm = await Npm7.create(spec, executor, Helpers);
        });

        describe('pack()', function () {
          const npmPackItems: NpmPackItem[] = [
            {
              name: 'tubby',
              filename: 'tubby-3.2.1.tgz',
              files: [],
            },
          ];

          beforeEach(function () {
            executor.resolves({
              stdout: JSON.stringify(npmPackItems),
            } as any);
          });

          describe('when called without options', function () {
            it('should call exec without extra flags', async function () {
              await npm.pack();

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

          describe('when called with "workspaces" option', function () {
            it('should call exec with --workspace args', async function () {
              await npm.pack({workspaces: ['bar', 'baz']});
              expect(executor, 'to have a call satisfying', [
                spec,
                [
                  'pack',
                  '--json',
                  `--pack-destination=${MOCK_TMPDIR}`,
                  '--foreground-scripts=false',
                  '--workspace=bar',
                  '--workspace=baz',
                ],
              ]);
            });
          });

          describe('when called with "allWorkspaces" option', function () {
            it('should call exec with --workspaces flag', async function () {
              await npm.pack({allWorkspaces: true});
              expect(executor, 'to have a call satisfying', [
                spec,
                [
                  'pack',
                  '--json',
                  `--pack-destination=${MOCK_TMPDIR}`,
                  '--foreground-scripts=false',
                  '--workspaces',
                ],
              ]);
            });

            describe('when called with "includeWorkspaceRoot" option', function () {
              it('should call exec with --workspaces flag and --include-workspace-root flag', async function () {
                await npm.pack({
                  allWorkspaces: true,
                  includeWorkspaceRoot: true,
                });
                expect(executor, 'to have a call satisfying', [
                  spec,
                  [
                    'pack',
                    '--json',
                    `--pack-destination=${MOCK_TMPDIR}`,
                    '--foreground-scripts=false',
                    '--workspaces',
                    '--include-workspace-root',
                  ],
                ]);
              });
            });
          });

          describe('when npm failed to spawn', function () {
            beforeEach(function () {
              executor.rejects(new Executor.ExecError({} as ExecaError));
            });

            it('should reject', async function () {
              await expect(npm.pack(), 'to be rejected with error satisfying', {
                code: 'ESMOKER_PACK',
              });
            });
          });

          describe(`when npm's stdout returns something other than a JSON string`, function () {
            beforeEach(function () {
              executor.resolves({stdout: '{not json}'} as any);
            });

            it('should reject', async function () {
              await expect(npm.pack(), 'to be rejected with error satisfying', {
                code: 'ESMOKER_PACKPARSE',
              });
            });
          });

          describe('when packing is successful', function () {
            it('should resolve with an array of PackedPackage objects', async function () {
              await expect(
                npm.pack(),
                'to be fulfilled with value satisfying',
                [
                  {
                    spec: `/some/dir/tubby-3.2.1.tgz`,
                    pkgName: 'tubby',
                    cwd: '/some/dir',
                  },
                ],
              );
            });
          });
        });

        describe('install()', function () {
          const manifest: PkgMgr.InstallManifest[] = [
            {
              spec: `${MOCK_TMPDIR}/bar.tgz`,
              pkgName: 'bar',
              cwd: MOCK_TMPDIR,
              installPath: `${MOCK_TMPDIR}/node_modules/bar`,
            },
            {
              spec: `${MOCK_TMPDIR}/baz.tgz`,
              pkgName: 'baz',
              cwd: MOCK_TMPDIR,
              installPath: `${MOCK_TMPDIR}/node_modules/baz`,
            },
          ];

          beforeEach(function () {
            executor.resolves({stdout: 'stuff', exitCode: 0} as any);
          });

          describe('when npm fails', function () {
            const err = new Executor.ExecError({} as ExecaError);
            beforeEach(function () {
              executor.rejects(err);
            });

            it('should reject', async function () {
              await expect(
                npm.install(manifest),
                'to be rejected with error satisfying',
                {
                  code: 'ESMOKER_INSTALL',
                  cause: err,
                },
              );
            });
          });

          it('should call npm with "--global-style"', async function () {
            await npm.install(manifest);
            expect(executor, 'to have a call satisfying', [
              spec,
              [
                'install',
                '--no-audit',
                '--no-package-lock',
                '--global-style',
                '--json',
                ...manifest.map(({spec}) => spec),
              ],
              {},
              {cwd: '/some/dir'},
            ]);
          });

          describe('when "manifest" argument is empty', function () {
            it('should reject', async function () {
              await expect(
                npm.install([]),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_INVALIDARG'},
              );
            });
          });
        });

        describe('runScript()', function () {
          beforeEach(function () {
            executor.resolves({failed: false, stdout: 'stuff'} as any);
          });
          describe('when called without "manifest" argument', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error - intentionally passing no args
                npm.runScript(),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_INVALIDARG'},
              );
            });
          });

          describe('when npm fails', function () {
            beforeEach(function () {
              executor.rejects(new Executor.ExecError({} as ExecaError));
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                npm.runScript(
                  {
                    cwd: `${MOCK_TMPDIR}/node_modules/foo`,
                    pkgName: 'foo',
                    script: 'some-script',
                  },
                  {} as any,
                ),
                'to be fulfilled with value satisfying',
                {
                  error: {code: 'ESMOKER_RUNSCRIPT'},
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
                npm.runScript(
                  {
                    cwd: `${MOCK_TMPDIR}/node_modules/foo`,
                    pkgName: 'foo',
                    script: 'some-script',
                  },
                  {} as any,
                ),
                'to be fulfilled with value satisfying',
                {
                  error: {code: 'ESMOKER_SCRIPTFAILED', context: {exitCode: 1}},
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
                npm.runScript(
                  {
                    cwd: `${MOCK_TMPDIR}/node_modules/foo`,
                    pkgName: 'foo',
                    script: 'some-script',
                  },
                  {} as any,
                ),
                'to be fulfilled with value satisfying',
                {
                  error: {code: 'ESMOKER_UNKNOWNSCRIPT'},
                },
              );
            });
          });

          describe('when the script succeeds', function () {
            it('should resolve with a result containing no error', async function () {
              await expect(
                npm.runScript(
                  {
                    cwd: `${MOCK_TMPDIR}/node_modules/foo`,
                    pkgName: 'foo',
                    script: 'some-script',
                  },
                  {} as any,
                ),
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
