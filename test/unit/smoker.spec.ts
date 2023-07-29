import type * as MS from '../../src';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import {SmokerError} from '../../src/error';
import * as Mocks from './mocks';

const expect = unexpected
  .clone()
  .use(unexpectedSinon)
  .use(unexpectedEventEmitter);

type AsyncStub<TArgs = any, TReturnValue = any> = sinon.SinonStub<
  TArgs[],
  Promise<TReturnValue>
>;

interface NodeFsPromisesMocks {
  mkdtemp: AsyncStub<any, string>;
  rm: AsyncStub;
  mkdir: AsyncStub;
  stat: AsyncStub;
}

export const MOCK_PM = '/bin/nullpm';
const MOCK_TMPROOT = '/some/tmp';
export const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

type SmokerSpecMocks = {
  'node:fs/promises': NodeFsPromisesMocks;
  'node:console': sinon.SinonStubbedInstance<typeof console>;
  debug: sinon.SinonStub<any, sinon.SinonStub>;
  'node:os': {tmpdir: sinon.SinonStub<any, string>};
  execa: Mocks.ExecaMock;
};

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  let Smoker: typeof MS.Smoker;

  let events: typeof MS.events;

  let smoke: typeof MS.smoke;

  let mocks: SmokerSpecMocks;

  let mockPm: Mocks.NullPm;

  beforeEach(function () {
    sandbox = createSandbox();

    const execaMock = Mocks.createExecaMock();

    mocks = {
      'node:fs/promises': {
        rm: sandbox.stub().resolves(),
        mkdtemp: sandbox.stub().resolves(MOCK_TMPDIR),
        mkdir: sandbox.stub().resolves(),
        stat: sandbox.stub().rejects(),
      },
      execa: execaMock,
      'node:console': sandbox.stub(console),
      'node:os': {
        tmpdir: sandbox.stub().returns(MOCK_TMPROOT),
      },
      debug: sandbox.stub().returns(sandbox.stub()),
    };

    mockPm = new Mocks.NullPm();

    ({Smoker, smoke, events} = rewiremock.proxy(
      () => require('../../src'),
      mocks,
    ));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Smoker', function () {
    describe('constructor', function () {
      it('should throw if both non-empty "workspace" and true "all" options are provided', function () {
        expect(
          () => new Smoker([], mockPm, {workspace: ['foo'], all: true}),
          'to throw',
          /Option "workspace" is mutually exclusive with "all" and\/or "includeRoot"/,
        );
      });

      describe('when option "includeRoot" is provided', function () {
        it('should set "all" option to true', function () {
          const smoker = new Smoker([], mockPm, {includeRoot: true});
          expect(smoker.opts.all, 'to be', true);
        });
      });

      describe('when passed a string for "scripts" argument', function () {
        it('should not throw', function () {
          expect(() => new Smoker('foo', mockPm), 'not to throw');
        });
      });
    });

    describe('method', function () {
      let smoker: MS.Smoker;

      beforeEach(function () {
        smoker = new Smoker('foo', mockPm);
      });

      describe('cleanup()', function () {
        describe('when `createWorkingDirectory()` has not yet been called', function () {
          it('should not attempt to prune the working directory', async function () {
            await smoker.cleanup();
            await expect(mocks['node:fs/promises'].rm, 'was not called');
          });
        });

        describe('when `createWorkingDirectory() has been successfully called', function () {
          it('should attempt to prune the working directory', async function () {
            await smoker.createWorkingDirectory();
            await smoker.cleanup();
            await expect(mocks['node:fs/promises'].rm, 'was called once');
          });

          describe('when it fails to prune the working directory', function () {
            describe('when the failure is not due to the non-existence of the working directory', function () {
              beforeEach(function () {
                mocks['node:fs/promises'].rm.rejects();
              });

              it('should reject', async function () {
                await smoker.createWorkingDirectory();
                await expect(
                  smoker.cleanup(),
                  'to be rejected with error satisfying',
                  /Failed to clean working directory/,
                );
              });
            });

            describe('when the failure is due to the non-existence of the working directory', function () {
              beforeEach(function () {
                const err: NodeJS.ErrnoException = new Error();
                err.code = 'ENOENT';
                mocks['node:fs/promises'].rm.rejects(err);
              });

              it('should not reject', async function () {
                await smoker.createWorkingDirectory();
                await expect(smoker.cleanup(), 'to be fulfilled');
              });
            });
          });
        });
      });

      describe('createWorkingDirectory()', function () {
        describe('when creating a temp directory fails', function () {
          beforeEach(function () {
            mocks['node:fs/promises'].mkdtemp.rejects();
          });

          it('should reject', async function () {
            await expect(
              smoker.createWorkingDirectory(),
              'to be rejected with error satisfying',
              /Failed to create temporary working directory/,
            );
          });
        });
        describe('when working directory already created', function () {
          it('should not attempt to create it again', async function () {
            await smoker.createWorkingDirectory();
            await smoker.createWorkingDirectory();
            await expect(
              mocks['node:fs/promises'].mkdtemp,
              'was called with',
              MOCK_TMPDIR,
            );
          });
        });

        describe('when explicit "dir" option provided to constructor', function () {
          let smoker: MS.Smoker;

          describe('when "force" option not provided to constructor', function () {
            beforeEach(function () {
              smoker = new Smoker('foo', mockPm, {dir: '/some/path/to/dir'});
            });

            describe('when the dir does not exist', function () {
              it('should assert the directory does not exist', async function () {
                await smoker.createWorkingDirectory();
                await expect(mocks['node:fs/promises'].stat, 'was called once');
              });

              it('should create the directory', async function () {
                await smoker.createWorkingDirectory();
                await expect(
                  mocks['node:fs/promises'].mkdir,
                  'was called once',
                );
              });

              it('should return the directory path', async function () {
                await expect(
                  smoker.createWorkingDirectory(),
                  'to be fulfilled with',
                  '/some/path/to/dir',
                );
              });

              describe('when the directory cannot be created', function () {
                beforeEach(function () {
                  mocks['node:fs/promises'].mkdir.rejects();
                });

                it('should reject', async function () {
                  await expect(
                    smoker.createWorkingDirectory(),
                    'to be rejected with error satisfying',
                    /Failed to create working directory/,
                  );
                });
              });
            });

            describe('when the dir exists', function () {
              it('should reject', async function () {
                mocks['node:fs/promises'].stat.resolves();
                await expect(
                  smoker.createWorkingDirectory(),
                  'to be rejected with error satisfying',
                  /Working directory \/some\/path\/to\/dir already exists/,
                );
              });
            });
          });

          describe('when "force" option provided to constructor', function () {
            beforeEach(function () {
              smoker = new Smoker('foo', mockPm, {
                dir: '/some/path/to/dir',
                force: true,
              });
            });

            it('should not assert the directory exists', async function () {
              await smoker.createWorkingDirectory();
              await expect(mocks['node:fs/promises'].stat, 'was not called');
            });

            describe('when "clean" option is provided to constructor', function () {
              beforeEach(function () {
                smoker = new Smoker('foo', mockPm, {
                  dir: '/some/path/to/dir',
                  force: true,
                  clean: true,
                });
              });

              it('should clean the directory', async function () {
                await smoker.createWorkingDirectory();
                await expect(mocks['node:fs/promises'].rm, 'was called once');
              });
            });
          });
        });
      });

      describe('pack()', function () {
        it('should emit the "PackBegin" event', async function () {
          await expect(
            smoker.pack(),
            'to emit from',
            smoker,
            events.PACK_BEGIN,
          );
        });

        it('should emit the "PackOk" event', async function () {
          await expect(smoker.pack(), 'to emit from', smoker, events.PACK_OK);
        });

        it('should return an InstallManifest object', async function () {
          const manifest = await smoker.pack();
          await expect(manifest, 'to equal', {
            packedPkgs: [
              {
                tarballFilepath: `${MOCK_TMPDIR}/bar.tgz`,
                installPath: `${MOCK_TMPDIR}/node_modules/bar`,
                pkgName: 'bar',
              },
              {
                tarballFilepath: `${MOCK_TMPDIR}/baz.tgz`,
                installPath: `${MOCK_TMPDIR}/node_modules/baz`,
                pkgName: 'baz',
              },
            ],
            tarballRootDir: MOCK_TMPDIR,
          });
        });

        describe('when packing fails', function () {
          beforeEach(function () {
            sandbox.stub(mockPm, 'pack').rejects(new Error('uh oh'));
          });

          it('should reject', async function () {
            await expect(
              smoker.pack(),
              'to be rejected with error satisfying',
              new Error('uh oh'),
            );
          });

          it('should emit the "PackFailed" event', async function () {
            await expect(
              async () => {
                // we have to eat the error to catch the event due to zalgo
                try {
                  await smoker.pack();
                } catch {}
              },
              'to emit from',
              smoker,
              events.PACK_FAILED,
              new Error('uh oh'),
            );
          });
        });

        describe('install()', function () {
          const manifest: MS.InstallManifest = {
            packedPkgs: [
              {
                tarballFilepath: `${MOCK_TMPDIR}/bar.tgz`,
                installPath: `${MOCK_TMPDIR}/node_modules/bar`,
                pkgName: 'bar',
              },
              {
                tarballFilepath: `${MOCK_TMPDIR}/baz.tgz`,
                installPath: `${MOCK_TMPDIR}/node_modules/baz`,
                pkgName: 'baz',
              },
            ],
            tarballRootDir: MOCK_TMPDIR,
          };

          it('should emit the "InstallBegin" event', async function () {
            await expect(
              smoker.install(manifest),
              'to emit from',
              smoker,
              events.INSTALL_BEGIN,
              manifest,
            );
          });

          it('should emit the "InstallOk" event', async function () {
            await expect(
              smoker.install(manifest),
              'to emit from',
              smoker,
              events.INSTALL_OK,
              manifest,
            );
          });

          describe('when called without "manifest" argument', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error invalid args
                smoker.install(),
                'to be rejected with error satisfying',
                new TypeError('(install) "manifest" arg is required'),
              );
            });
          });

          describe('when "manifest" argument is empty', function () {
            it('should reject', async function () {
              await expect(
                smoker.install({packedPkgs: [], tarballRootDir: MOCK_TMPDIR}),
                'to be rejected with error satisfying',
                new TypeError(
                  '(install) "manifest" arg must contain non-empty list of packed packages',
                ),
              );
            });
          });

          describe(`when the PackageManager's installation fails`, function () {
            beforeEach(function () {
              sandbox.stub(mockPm, 'install').rejects(new Error('uh oh'));
            });

            it('should emit "InstallFailed" event', async function () {
              await expect(
                async () => {
                  // we have to eat the error to catch the event due to zalgo
                  try {
                    await smoker.install(manifest);
                  } catch {}
                },
                'to emit from',
                smoker,
                events.INSTALL_FAILED,
                new Error('uh oh'),
              );
            });

            it('should reject', async function () {
              await expect(
                smoker.install(manifest),
                'to be rejected with error satisfying',
                new Error('uh oh'),
              );
            });
          });
        });

        describe('runScripts()', function () {
          const packedPkgs: MS.PackedPackage[] = [
            {
              tarballFilepath: `${MOCK_TMPDIR}/bar.tgz`,
              installPath: `${MOCK_TMPDIR}/node_modules/bar`,
              pkgName: 'bar',
            },
            {
              tarballFilepath: `${MOCK_TMPDIR}/baz.tgz`,
              installPath: `${MOCK_TMPDIR}/node_modules/baz`,
              pkgName: 'baz',
            },
          ];

          describe('when the arguments are correct', function () {
            it('should emit the "RunScriptsBegin" event', async function () {
              await expect(
                smoker.runScripts(packedPkgs),
                'to emit from',
                smoker,
                events.RUN_SCRIPTS_BEGIN,
                {scripts: ['foo'], packedPkgs, total: 2},
              );
            });

            it('should emit the "RunScriptBegin" event (for the first script)', async function () {
              await expect(
                smoker.runScripts(packedPkgs),
                'to emit from',
                smoker,
                events.RUN_SCRIPT_BEGIN,
                {script: 'foo', pkgName: 'bar', total: 2, current: 0},
              );
            });
          });

          describe('when called without "packedPkgs" argument', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error invalid args
                smoker.runScripts(),
                'to be rejected with error satisfying',
                new TypeError('(runScripts) "packedPkgs" arg is required'),
              );
            });
          });

          describe('when "packedPkgs" argument is empty', function () {
            it('should reject', async function () {
              'bar';
              await expect(
                smoker.runScripts([]),
                'to be rejected with error satisfying',
                new TypeError(
                  '(runScripts) "packedPkgs" arg must not be empty',
                ),
              );
            });
          });

          describe('when the scripts succeed', function () {
            it('should emit the "RunScriptsOk" event', async function () {
              await expect(
                smoker.runScripts(packedPkgs),
                'to emit from',
                smoker,
                events.RUN_SCRIPTS_OK,
                {
                  scripts: ['foo'],
                  total: 2,
                  executed: 2,
                  results: expect.it('to be an array'),
                },
              );
            });

            it('should emit the "RunScriptOk" event (for the first script)', async function () {
              // XXX: this emits twice; one for each package. the unexpected plugin
              // does not support this and only sees the first one
              await expect(
                smoker.runScripts(packedPkgs),
                'to emit from',
                smoker,
                events.RUN_SCRIPT_OK,
                {
                  script: 'foo',
                  current: 0,
                  total: 2,
                  rawResult: {},
                  pkgName: 'bar',
                },
              );
            });

            it(`should resolve with an array of run results`, async function () {
              await expect(
                smoker.runScripts(packedPkgs),
                'to be fulfilled with value satisfying',
                [{pkgName: 'bar'}, {pkgName: 'baz'}],
              );
            });
          });

          describe('when the PackageManager rejects', function () {
            beforeEach(function () {
              sandbox.stub(mockPm, 'runScript').rejects(new Error('oh noes'));
            });

            it('should reject', async function () {
              await expect(
                smoker.runScripts(packedPkgs),
                'to be rejected with error satisfying',
                new SmokerError(
                  '(runScripts): Unknown failure from "nullpm" plugin: Error: oh noes',
                ),
              );
            });
          });

          describe('when a script fails', function () {
            let err: SmokerError;
            beforeEach(function () {
              err = new SmokerError('oh noes');
              sandbox
                .stub(mockPm, 'runScript')
                .callThrough()
                .onFirstCall()
                .callsFake(async ({pkgName}, script) => {
                  return {
                    pkgName,
                    error: err,
                    script,
                    rawResult: {} as MS.RunScriptValue,
                  };
                });
            });
            it('should emit the "RunScriptFailed" event', async function () {
              await expect(
                smoker.runScripts(packedPkgs),
                'to emit from',
                smoker,
                events.RUN_SCRIPT_FAILED,
                {
                  pkgName: 'bar',
                  error: expect.it('to be a', SmokerError),
                  script: 'foo',
                  current: 0,
                  total: 2,
                  rawResult: {},
                },
              );
            });

            it('should emit the "RunScriptsFailed" event', async function () {
              await expect(
                smoker.runScripts(packedPkgs),
                'to emit from',
                smoker,
                events.RUN_SCRIPTS_FAILED,
                {
                  results: [
                    {pkgName: 'bar', error: expect.it('to be a', SmokerError)},
                    {pkgName: 'baz', error: undefined},
                  ],
                  scripts: ['foo'],
                  total: 2,
                  failures: 1,
                  executed: 2,
                },
              );
            });

            describe('when the "bail" option is false', function () {
              beforeEach(function () {
                smoker = new Smoker('foo', mockPm, {bail: false});
              });

              it('should execute all scripts', async function () {
                await expect(
                  smoker.runScripts(packedPkgs),
                  'to be fulfilled with value satisfying',
                  [
                    {pkgName: 'bar', error: err},
                    {pkgName: 'baz', error: undefined},
                  ],
                );
              });
            });

            describe('when the "bail" option is true', function () {
              beforeEach(function () {
                smoker = new Smoker('foo', mockPm, {bail: true});
              });

              it('should execute only until a script fails', async function () {
                await expect(
                  smoker.runScripts(packedPkgs),
                  'to be fulfilled with value satisfying',
                  expect
                    .it('to have length', 1)
                    .and('to satisfy', [{pkgName: 'bar', error: err}]),
                );
              });
            });
          });
        });
      });
    });

    describe('static method', function () {
      describe('withNpm()', function () {
        it('should return a Smoker instance with an Npm PackageManager', function () {
          const smoker = Smoker.withNpm('foo');
          // instanceof may not work here given all the mocks flying around
          expect(smoker.pm.name, 'to be', 'npm');
        });
      });

      describe('smoke()', function () {
        it('should initialize a Smoker instance and call smoke()', async function () {
          await expect(smoke('foo'), 'to be fulfilled with value satisfying', [
            {pkgName: 'bar', script: 'foo'},
          ]);
        });
      });
    });

    // describe('static method', function () {
    //   describe('smoke()', function () {
    //     let globalStyleFlag: string;

    //     beforeEach(async function () {
    //       // const smoker = new Smoker('foo');
    //       // const {version} = await smoker.findNpm();
    //       // globalStyleFlag =
    //       //   version.startsWith('7') || version.startsWith('8')
    //       //     ? '--global-style'
    //       //     : '--install-strategy=shallow';
    //       // mocks.execa.resetHistory();
    //       sandbox
    //         .stub(Smoker, 'withNpm')
    //         .callsFake((scripts: string[] | string, opts?: SmokerOptions) => {
    //           return new Smoker(scripts, mockPm, opts);
    //         });
    //     });

    //     it('should pack, install, and run scripts', async function () {
    //       await smoke('foo');
    //       expect(mocks.execa, 'to have calls satisfying', [
    //         [MOCK_PM, ['--version']],
    //         [
    //           MOCK_PM,
    //           [
    //             'pack',
    //             '--json',
    //             `--pack-destination=${MOCK_TMPDIR}`,
    //             '--foreground-scripts=false',
    //           ],
    //           {},
    //         ],
    //         [
    //           MOCK_PM,
    //           ['install', globalStyleFlag, `${MOCK_TMPDIR}/tarball.tgz`],
    //           {cwd: MOCK_TMPDIR},
    //         ],
    //         [
    //           MOCK_PM,
    //           ['run-script', 'foo'],
    //           {cwd: `${MOCK_TMPDIR}/node_modules/bar`},
    //         ],
    //       ]);
    //     });
    //   });
    // });
  });
});
