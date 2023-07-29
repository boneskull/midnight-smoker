import type {ExecaReturnValue} from 'execa';
import {Readable} from 'node:stream';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {SmokerError} from '../../../src/error';
import type * as NPM from '../../../src/pm/npm';
import * as Mocks from '../mocks';
import {InstallManifest} from '../../../src/types';

const expect = unexpected.clone().use(unexpectedSinon);

interface NpmSpecMocks {
  which: Mocks.WhichMock;
  execa: Mocks.ExecaMock;
  'node:console': Mocks.ConsoleMock;
  debug: Mocks.DebugMock;
}

const MOCK_NPM_PATH = '/usr/bin/npm';

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  let mocks: NpmSpecMocks;

  let stdout: sinon.SinonStubbedInstance<Readable>;
  let stderr: sinon.SinonStubbedInstance<Readable>;

  let Npm: typeof NPM.Npm;
  let npmFactory: typeof NPM.default;

  beforeEach(function () {
    sandbox = createSandbox();

    const readableMocks: Mocks.ReadableMocks = {} as any;
    const execaMock = Mocks.createExecaMock(readableMocks);
    ({stdout, stderr} = readableMocks);
    execaMock.node
      .withArgs(MOCK_NPM_PATH, ['--version'])
      .resolves({stdout: '9.8.1', command: `${MOCK_NPM_PATH} --version`});

    mocks = {
      which: sandbox.stub().resolves(MOCK_NPM_PATH) as Mocks.WhichMock,
      execa: execaMock,
      'node:console': sandbox.stub(console) as Mocks.ConsoleMock,
      debug: sandbox.stub().returns(sandbox.stub()) as Mocks.DebugMock,
    };

    ({default: npmFactory, Npm} = rewiremock.proxy(
      () => require('../../../src/pm/npm'),
      mocks,
    ));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('package manager', function () {
    describe('npm', function () {
      describe('factory', function () {
        it('should return an Npm instance', function () {
          expect(npmFactory(), 'to be a', Npm);
        });
      });

      describe('Npm', function () {
        describe('constructor', function () {
          describe('when provided no options', function () {
            it('should throw', function () {
              expect(() => new Npm(), 'not to throw');
            });
          });
        });

        describe('method', function () {
          let npm: NPM.Npm;

          beforeEach(function () {
            npm = new Npm();
          });

          describe('getBinPath()', function () {
            beforeEach(function () {
              mocks.execa.node.resolves({exitCode: 0, stdout: '1.2.3'});
            });

            describe('when the "path" option was provided to the constructor', function () {
              beforeEach(function () {
                npm = new Npm({binPath: MOCK_NPM_PATH});
              });

              it('should not look in the PATH for an executable', async function () {
                await npm.getBinPath();
                expect(mocks.which, 'was not called');
              });

              it('should resolve with the value of the "path" option', async function () {
                await expect(
                  npm.getBinPath(),
                  'to be fulfilled with',
                  MOCK_NPM_PATH,
                );
              });
            });

            describe('when the "path" option was not provided to the constructor', function () {
              let npm: NPM.Npm;

              beforeEach(function () {
                npm = new Npm();
              });

              it('should look in the PATH for an executable', async function () {
                await npm.getBinPath();
                expect(mocks.which, 'to have a call satisfying', ['npm']);
              });

              describe('when the executable is not found', function () {
                beforeEach(function () {
                  mocks.which.rejects(new Error('not found'));
                });

                it('should reject', async function () {
                  await expect(
                    npm.getBinPath(),
                    'to be rejected with',
                    /not found/,
                  );
                });
              });

              describe('when the executable is found', function () {
                it('should resolve with the path', async function () {
                  await expect(
                    npm.getBinPath(),
                    'to be fulfilled with',
                    MOCK_NPM_PATH,
                  );
                });

                describe('when called multiple times', function () {
                  it('should cache the value', async function () {
                    await npm.getBinPath();
                    await npm.getBinPath();
                    expect(mocks.which, 'was called once');
                  });
                });
              });
            });
          });

          describe('getVersion()', function () {
            beforeEach(function () {
              sandbox.stub(Npm.prototype, 'getBinPath').resolves(MOCK_NPM_PATH);
            });

            it('should return a version number', function () {
              expect(npm.getVersion(), 'to be fulfilled with', '9.8.1');
            });

            it('should execute "npm --version"', async function () {
              await npm.getVersion();
              expect(mocks.execa.node, 'to have a call satisfying', [
                MOCK_NPM_PATH,
                ['--version'],
              ]);
            });

            describe('when called multiple times', function () {
              it('should cache the value', async function () {
                await npm.getVersion();
                await npm.getVersion();
                expect(mocks.execa.node, 'was called once');
              });
            });
          });

          describe('pack()', function () {
            const npmPackItems: NPM.NpmPackItem[] = [
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

            let execStub: sinon.SinonStubbedMember<NPM.Npm['exec']>;

            beforeEach(function () {
              execStub = sandbox.stub(Npm.prototype, 'exec').resolves({
                stdout: JSON.stringify(npmPackItems),
              } as ExecaReturnValue);
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
                  new SmokerError('(pack) npm failed to spawn: no such npm'),
                );
              });
            });

            describe('when npm returns a non-zero exit code', function () {
              beforeEach(function () {
                execStub.resolves({
                  exitCode: 1,
                  stderr: 'oh no',
                } as ExecaReturnValue);
              });

              it('should reject', async function () {
                await expect(
                  npm.pack('foo'),
                  'to be rejected with error satisfying',
                  new SmokerError(
                    '(pack) Packing failed with exit code 1: oh no',
                  ),
                );
              });
            });

            describe(`when npm's stdout returns something other than a JSON string`, function () {
              beforeEach(function () {
                execStub.resolves({stdout: '{not json}'} as ExecaReturnValue);
              });

              it('should reject', async function () {
                await expect(
                  npm.pack('foo'),
                  'to be rejected with error satisfying',
                  new SmokerError(
                    '(pack) Failed to parse JSON output from "npm pack": {not json}',
                  ),
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
              mocks.execa.node.resolves({stdout: 'stuff'} as ExecaReturnValue);
            });

            describe('when npm fails to spawn', function () {
              beforeEach(function () {
                mocks.execa.node.rejects(new Error('no such npm'));
              });

              it('should reject', async function () {
                await expect(
                  npm.install(manifest),
                  'to be rejected with error satisfying',
                  new SmokerError('(install) npm failed to spawn: no such npm'),
                );
              });
            });

            describe('when "npm install" returns a non-zero exit code', function () {
              beforeEach(function () {
                mocks.execa.node.resolves({
                  exitCode: 1,
                  stderr: 'wackadoo',
                } as ExecaReturnValue);
              });

              it('should reject', async function () {
                return expect(
                  npm.install(manifest),
                  'to be rejected with error satisfying',
                  new SmokerError(
                    '(install) Installation failed with exit code 1: wackadoo',
                  ),
                );
              });
            });

            describe('when npm is version 9 or newer', function () {
              it('should call npm with "--install-strategy=shallow', async function () {
                await npm.install(manifest);
                expect(mocks.execa.node, 'to have a call satisfying', [
                  MOCK_NPM_PATH,
                  [
                    'install',
                    '--install-strategy=shallow',
                    ...manifest.packedPkgs.map((pkg) => pkg.tarballFilepath),
                  ],
                  {cwd: '/some/dir'},
                ]);
              });
            });

            describe('when npm is version 7 or 8', function () {
              beforeEach(function () {
                mocks.execa.node
                  .withArgs(MOCK_NPM_PATH, ['--version'])
                  .resolves({stdout: '7.0.0'});
              });

              it('should call npm with "--global-style', async function () {
                await npm.install(manifest);
                expect(mocks.execa.node, 'to have a call satisfying', [
                  MOCK_NPM_PATH,
                  [
                    'install',
                    '--global-style',
                    ...manifest.packedPkgs.map((pkg) => pkg.tarballFilepath),
                  ],
                  {cwd: '/some/dir'},
                ]);
              });
            });

            describe('when "packedPkgs" argument is empty', function () {
              it('should reject', async function () {
                await expect(
                  npm.install({packedPkgs: [], tarballRootDir: '/some/dir'}),
                  'to be rejected with error satisfying',
                  new TypeError(
                    '(install) Non-empty "packedPkgs" arg is required',
                  ),
                );
              });
            });
          });

          describe('runScript()', function () {
            describe('when called without "packedPkg" argument', function () {
              it('should reject', async function () {
                await expect(
                  // @ts-expect-error - intentionally passing no args
                  npm.runScript(),
                  'to be rejected with error satisfying',
                  new TypeError('(runScript) "packedPkg" arg is required'),
                );
              });
            });

            describe('when npm fails to spawn', function () {
              beforeEach(function () {
                mocks.execa.node.rejects(new Error('no such npm'));
              });

              it('should resolve with a result containing an error', async function () {
                await expect(
                  npm.runScript(
                    {
                      installPath: '/some/dir/node_modules/foo',
                      pkgName: 'foo',
                      tarballFilepath: '/some/dir/foo.tgz',
                    },
                    'some-script',
                  ),
                  'to be fulfilled with value satisfying',
                  {
                    error: new SmokerError(
                      '(runScript) npm failed to spawn: no such npm',
                    ),
                  },
                );
              });
            });

            describe('when the script fails', function () {
              beforeEach(function () {
                mocks.execa.node.resolves({failed: true, all: 'reasons'});
              });

              it('should resolve with a result containing an error', async function () {
                await expect(
                  npm.runScript(
                    {
                      installPath: '/some/dir/node_modules/foo',
                      pkgName: 'foo',
                      tarballFilepath: '/some/dir/foo.tgz',
                    },
                    'some-script',
                  ),
                  'to be fulfilled with value satisfying',
                  {
                    error: new SmokerError(
                      '(runScript) Script "some-script" in package "foo" failed: reasons',
                    ),
                  },
                );
              });
            });

            describe('when the script fails with an exit code', function () {
              beforeEach(function () {
                mocks.execa.node.resolves({
                  failed: true,
                  all: 'reasons',
                  exitCode: 1,
                });
              });

              it('should resolve with a result containing an error', async function () {
                await expect(
                  npm.runScript(
                    {
                      installPath: '/some/dir/node_modules/foo',
                      pkgName: 'foo',
                      tarballFilepath: '/some/dir/foo.tgz',
                    },
                    'some-script',
                  ),
                  'to be fulfilled with value satisfying',
                  {
                    error: new SmokerError(
                      '(runScript) Script "some-script" in package "foo" failed with exit code 1: reasons',
                    ),
                  },
                );
              });
            });

            describe('when the script was not found', function () {
              beforeEach(function () {
                mocks.execa.node.resolves({
                  failed: true,
                  stderr: 'missing script:',
                });
              });

              it('should resolve with a result containing an error', async function () {
                await expect(
                  npm.runScript(
                    {
                      installPath: '/some/dir/node_modules/foo',
                      pkgName: 'foo',
                      tarballFilepath: '/some/dir/foo.tgz',
                    },
                    'some-script',
                  ),
                  'to be fulfilled with value satisfying',
                  {
                    error: new SmokerError(
                      '(runScript) Script "some-script" in package "foo" failed; script not found',
                    ),
                  },
                );
              });
            });

            describe('when the script succeeds', function () {
              it('should resolve with a result containing no error', async function () {
                await expect(
                  npm.runScript(
                    {
                      installPath: '/some/dir/node_modules/foo',
                      pkgName: 'foo',
                      tarballFilepath: '/some/dir/foo.tgz',
                    },
                    'some-script',
                  ),
                  'to be fulfilled with value satisfying',
                  expect.it('not to have key', 'error'),
                );
              });
            });
          });

          describe('exec()', function () {
            describe('when "verbose" PackageManager option is true"', function () {
              beforeEach(async function () {
                npm = new Npm({verbose: true});
                await npm.exec(['foo', 'bar', 'baz']);
              });

              it('should pipe to STDOUT', async function () {
                expect(stdout.pipe, 'was called once');
              });

              it('should pipe to STDERR', async function () {
                expect(stderr.pipe, 'was called once');
              });
            });

            describe('when "verbose" PackageManager option is false"', function () {
              beforeEach(async function () {
                npm = new Npm({verbose: false});
                await npm.exec(['foo', 'bar', 'baz']);
              });

              it('should not pipe to STDOUT', async function () {
                expect(stdout.pipe, 'was not called');
              });

              it('should not pipe to STDERR', async function () {
                expect(stderr.pipe, 'was not called');
              });
            });

            it('should execute "npm" with the given args', async function () {
              await expect(
                npm.exec(['foo', '--bar=baz']),
                'to be fulfilled with value satisfying',
                {command: `${MOCK_NPM_PATH} foo --bar=baz`},
              );
            });
            // describe('when in "verbose" mode', function () {
            //   beforeEach(async function () {
            //     smoker = new Smoker('foo', mockPm, {verbose: true});
            //     await smoker.install(packItems);
            //   });
            //   it('should pipe to STDOUT', function () {
            //     expect(stdout.pipe, 'was called once');
            //   });
            //   it('should pipe to STDERR', function () {
            //     expect(stderr.pipe, 'was called once');
            //   });
            // });
            // describe('when not in "verbose" mode', function () {
            //   beforeEach(async function () {
            //     await smoker.install(packItems);
            //   });
            //   it('should not pipe to STDERR', function () {
            //     expect(stderr.pipe, 'was not called');
            //   });
            //   it('should not pipe to STDOUT', function () {
            //     expect(stdout.pipe, 'was not called');
            //   });
            // });
          });
        });
      });
    });
  });
});
