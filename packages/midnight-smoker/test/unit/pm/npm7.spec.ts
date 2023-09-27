import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {CorepackExecutor} from '../../../src/pm/corepack';
import type * as NPM7 from '../../../src/pm/npm7';
import {InstallManifest} from '../../../src/types';
import * as Mocks from '../mocks';

const expect = unexpected.clone().use(unexpectedSinon);

interface Npm7SpecMocks {
  'node:console': Mocks.ConsoleMock;
  debug: Mocks.DebugMock;
}

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  let mocks: Npm7SpecMocks;

  let Npm7: typeof NPM7.Npm7;
  let executor: sinon.SinonStubbedInstance<CorepackExecutor>;
  let execStub: sinon.SinonStubbedMember<CorepackExecutor['exec']>;

  beforeEach(function () {
    sandbox = createSandbox();

    execStub = sandbox
      .stub<
        Parameters<CorepackExecutor['exec']>,
        ReturnType<CorepackExecutor['exec']>
      >()
      .resolves({} as any);

    mocks = {
      // execa: execaMock,
      'node:console': sandbox.stub(console) as Mocks.ConsoleMock,
      debug: sandbox.stub().returns(sandbox.stub()) as Mocks.DebugMock,
    };

    executor = sandbox.createStubInstance(CorepackExecutor, {
      exec: execStub,
    });

    ({Npm7} = rewiremock.proxy(() => require('../../../src/pm/npm7'), mocks));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('package manager', function () {
    describe('Npm7', function () {
      describe('static method', function () {
        it('should return an Npm instance', async function () {
          expect(Npm7.load(executor), 'to be a', Npm7);
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

        beforeEach(function () {
          npm = new Npm7(executor);
        });

        describe('pack()', function () {
          const npmPackItems: NPM7.NpmPackItem[] = [
            {
              id: '1',
              name: 'tubby',
              version: '3.2.1',
              size: 444,
              unpackedSize: 555,
              shasum: '',
              integrity: '',
              filename: 'tubby-3.2.1.tgz',
              files: [],
              entryCount: 0,
              bundled: [],
            },
          ];

          beforeEach(function () {
            execStub.resolves({
              stdout: JSON.stringify(npmPackItems),
            } as any);
          });

          describe('when called without options', function () {
            it('should call exec without extra flags', async function () {
              await npm.pack('foo');
              expect(execStub, 'to have a call satisfying', [
                [
                  'pack',
                  '--json',
                  `--pack-destination=foo`,
                  '--foreground-scripts=false',
                ],
              ]);
            });
          });

          describe('when called with "workspaces" option', function () {
            it('should call exec with --workspace args', async function () {
              await npm.pack('foo', {workspaces: ['bar', 'baz']});
              expect(execStub, 'to have a call satisfying', [
                [
                  'pack',
                  '--json',
                  `--pack-destination=foo`,
                  '--foreground-scripts=false',
                  '--workspace=bar',
                  '--workspace=baz',
                ],
              ]);
            });
          });

          describe('when called with "allWorkspaces" option', function () {
            it('should call exec with --workspaces flag', async function () {
              await npm.pack('foo', {allWorkspaces: true});
              expect(execStub, 'to have a call satisfying', [
                [
                  'pack',
                  '--json',
                  `--pack-destination=foo`,
                  '--foreground-scripts=false',
                  '--workspaces',
                ],
              ]);
            });

            describe('when called with "includeWorkspaceRoot" option', function () {
              it('should call exec with --workspaces flag and --include-workspace-root flag', async function () {
                await npm.pack('foo', {
                  allWorkspaces: true,
                  includeWorkspaceRoot: true,
                });
                expect(execStub, 'to have a call satisfying', [
                  [
                    'pack',
                    '--json',
                    `--pack-destination=foo`,
                    '--foreground-scripts=false',
                    '--workspaces',
                    '--include-workspace-root',
                  ],
                ]);
              });
            });
          });

          describe('when called without an "outDir" arg', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error - testing invalid args
                npm.pack(),
                'to be rejected with error satisfying',
                new TypeError('(pack) "dest" arg is required'),
              );
            });
          });

          describe('when npm failed to spawn', function () {
            beforeEach(function () {
              execStub.rejects(new Error('no such npm'));
            });

            it('should reject', async function () {
              await expect(
                npm.pack('foo'),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_PACK'},
              );
            });
          });

          describe('when npm returns a non-zero exit code', function () {
            beforeEach(function () {
              execStub.resolves({
                exitCode: 1,
                stderr: 'oh no',
              } as any);
            });

            it('should reject', async function () {
              await expect(
                npm.pack('foo'),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_PACK', cause: {exitCode: 1, pm: 'npm'}},
              );
            });
          });

          describe(`when npm's stdout returns something other than a JSON string`, function () {
            beforeEach(function () {
              execStub.resolves({stdout: '{not json}'} as any);
            });

            it('should reject', async function () {
              await expect(
                npm.pack('foo'),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_PACKPARSE'},
              );
            });
          });

          describe('when packing is successful', function () {
            it('should resolve with an array of PackedPackage objects', async function () {
              await expect(
                npm.pack('/some/dir'),
                'to be fulfilled with value satisfying',
                {
                  packedPkgs: [
                    {
                      tarballFilepath: `/some/dir/tubby-3.2.1.tgz`,
                      installPath: `/some/dir/node_modules/tubby`,
                      pkgName: 'tubby',
                    },
                  ],
                  tarballRootDir: '/some/dir',
                },
              );
            });
          });
        });

        describe('install()', function () {
          const manifest: InstallManifest = {
            packedPkgs: [
              {
                tarballFilepath: `/some/dir/tubby-3.2.1.tgz`,
                installPath: `/some/dir/node_modules/tubby`,
                pkgName: 'tubby',
              },
              {
                tarballFilepath: `/some/dir/scrubby-1.2.3.tgz`,
                installPath: `/some/dir/node_modules/scrubby`,
                pkgName: 'scrubby',
              },
            ],
            tarballRootDir: '/some/dir',
          };

          beforeEach(function () {
            execStub.resolves({stdout: 'stuff'} as any);
          });

          describe('when npm fails to spawn', function () {
            beforeEach(function () {
              execStub.rejects(new Error('no such npm'));
            });

            it('should reject', async function () {
              await expect(
                npm.install(manifest),
                'to be rejected with error satisfying',
                {
                  code: 'ESMOKER_INSTALL',
                  cause: {error: new Error('no such npm')},
                },
              );
            });
          });

          describe('when "npm install" returns a non-zero exit code', function () {
            beforeEach(function () {
              execStub.resolves({
                exitCode: 1,
                stderr: 'wackadoo',
              } as any);
            });

            it('should reject', async function () {
              return expect(
                npm.install(manifest),
                'to be rejected with error satisfying',
                {
                  code: 'ESMOKER_INSTALL',
                  cause: {exitCode: 1, pm: 'npm'},
                },
              );
            });
          });

          it('should call npm with "--global-style', async function () {
            await npm.install(manifest);
            expect(execStub, 'to have a call satisfying', [
              [
                'install',
                '--no-package-lock',
                '--global-style',
                ...manifest.packedPkgs.map((pkg) => pkg.tarballFilepath),
              ],
              {cwd: '/some/dir'},
            ]);
          });

          describe('when "manifest" argument is empty', function () {
            it('should reject', async function () {
              await expect(
                npm.install({packedPkgs: [], tarballRootDir: '/some/dir'}),
                'to be rejected with error satisfying',
                new TypeError('(install) Non-empty "manifest" arg is required'),
              );
            });
          });
        });

        describe('runScript()', function () {
          describe('when called without "manifest" argument', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error - intentionally passing no args
                npm.runScript(),
                'to be rejected with error satisfying',
                new TypeError('(runScript) "manifest" arg is required'),
              );
            });
          });

          describe('when npm fails to spawn', function () {
            beforeEach(function () {
              execStub.rejects(new Error('no such npm'));
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                npm.runScript({
                  packedPkg: {
                    installPath: '/some/dir/node_modules/foo',
                    pkgName: 'foo',
                    tarballFilepath: '/some/dir/foo.tgz',
                  },
                  script: 'some-script',
                }),
                'to be fulfilled with value satisfying',
                {
                  error: {code: 'ESMOKER_RUNSCRIPT'},
                },
              );
            });
          });

          describe('when the script fails', function () {
            beforeEach(function () {
              execStub.resolves({failed: true, all: 'reasons'} as any);
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                npm.runScript({
                  packedPkg: {
                    installPath: '/some/dir/node_modules/foo',
                    pkgName: 'foo',
                    tarballFilepath: '/some/dir/foo.tgz',
                  },
                  script: 'some-script',
                }),
                'to be fulfilled with value satisfying',
                {
                  error: {code: 'ESMOKER_RUNSCRIPT'},
                },
              );
            });
          });

          describe('when the script fails with an exit code', function () {
            beforeEach(function () {
              execStub.resolves({
                failed: true,
                all: 'reasons',
                exitCode: 1,
              } as any);
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                npm.runScript({
                  packedPkg: {
                    installPath: '/some/dir/node_modules/foo',
                    pkgName: 'foo',
                    tarballFilepath: '/some/dir/foo.tgz',
                  },
                  script: 'some-script',
                }),
                'to be fulfilled with value satisfying',
                {
                  error: {code: 'ESMOKER_RUNSCRIPT', cause: {exitCode: 1}},
                },
              );
            });
          });

          describe('when the script was not found', function () {
            beforeEach(function () {
              execStub.resolves({
                failed: true,
                stderr: 'missing script:',
              } as any);
            });

            it('should resolve with a result containing an error', async function () {
              await expect(
                npm.runScript({
                  packedPkg: {
                    installPath: '/some/dir/node_modules/foo',
                    pkgName: 'foo',
                    tarballFilepath: '/some/dir/foo.tgz',
                  },
                  script: 'some-script',
                }),
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
                npm.runScript({
                  packedPkg: {
                    installPath: '/some/dir/node_modules/foo',
                    pkgName: 'foo',
                    tarballFilepath: '/some/dir/foo.tgz',
                  },
                  script: 'some-script',
                }),
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
