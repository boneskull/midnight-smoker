import type {mkdir, mkdtemp, rm, stat} from 'node:fs/promises';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import type * as MS from '../../src';
import * as Errors from '../../src/error';
import {SmokerError} from '../../src/error';
import {CorepackExecutor} from '../../src/pm/corepack';
import * as Mocks from './mocks';

const expect = unexpected
  .clone()
  .use(unexpectedSinon)
  .use(unexpectedEventEmitter);

interface NodeFsPromisesMocks {
  mkdir: sinon.SinonStubbedMember<typeof mkdir>;
  mkdtemp: sinon.SinonStubbedMember<typeof mkdtemp>;
  rm: sinon.SinonStubbedMember<typeof rm>;
  stat: sinon.SinonStubbedMember<typeof stat>;
}

export const MOCK_PM = '/bin/nullpm';
const MOCK_PM_ID = 'nullpm@1.0.0';
const MOCK_TMPROOT = '/some/tmp';
export const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

type SmokerSpecMocks = {
  'node:fs/promises': NodeFsPromisesMocks;
  'node:console': sinon.SinonStubbedInstance<typeof console>;
  debug: sinon.SinonStub<any, sinon.SinonStub>;
  'node:os': {tmpdir: sinon.SinonStub<any, string>};
  execa: Mocks.ExecaMock;
  'read-pkg-up': sinon.SinonStub<
    any,
    Promise<{packageJson: {name: 'foo'}; path: '/some/path/to/package.json'}>
  >;
  '../../src/pm': {
    loadPackageManagers: sinon.SinonStub<any, Map<string, MS.PackageManager>>;
  };
};

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  let Smoker: typeof MS.Smoker;

  let Event: typeof MS.Event;

  let smoke: typeof MS.smoke;

  let mocks: SmokerSpecMocks;

  let mockPm: Mocks.NullPm;

  let pms: Map<string, MS.PackageManager>;

  beforeEach(function () {
    sandbox = createSandbox();
    pms = new Map();
    const execaMock = Mocks.createExecaMock();

    mocks = {
      'node:fs/promises': {
        rm: sandbox.stub<Parameters<typeof rm>>().resolves(),
        mkdtemp: sandbox
          .stub<Parameters<typeof mkdtemp>>()
          .resolves(MOCK_TMPDIR),
        mkdir: sandbox.stub<Parameters<typeof mkdir>>().resolves(),
        stat: sandbox.stub<Parameters<typeof stat>>().rejects(),
      },
      execa: execaMock,
      'node:console': sandbox.stub(console),
      'node:os': {
        tmpdir: sandbox.stub().returns(MOCK_TMPROOT),
      },
      debug: sandbox.stub().returns(sandbox.stub()),
      'read-pkg-up': sandbox.stub().returns({
        packageJson: {name: 'foo'},
        path: '/some/path/to/package.json',
      }),
      '../../src/pm': {
        loadPackageManagers: sandbox.stub().resolves(pms),
      },
    };

    mockPm = new Mocks.NullPm(new CorepackExecutor('moo'));
    pms.set(MOCK_PM_ID, mockPm);

    ({Smoker, smoke, Event} = rewiremock.proxy(
      () => require('../../src'),
      mocks,
    ));
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('class Smoker', function () {
    describe('method', function () {
      let smoker: MS.Smoker;

      beforeEach(function () {
        smoker = Smoker.create(pms, {script: 'foo'});
      });

      describe('cleanup()', function () {
        describe('when `createTempDir()` has not yet been called', function () {
          it('should not attempt to prune the temp directories', async function () {
            await smoker.cleanup();
            await expect(mocks['node:fs/promises'].rm, 'was not called');
          });
        });

        describe('when `createTempDir() has been successfully called', function () {
          it('should attempt to prune the temp directory', async function () {
            await smoker.createTempDir();
            await smoker.cleanup();
            await expect(mocks['node:fs/promises'].rm, 'was called once');
          });

          describe('when it fails to prune the temp directory', function () {
            describe('when the failure is not due to the non-existence of the temp directory', function () {
              beforeEach(function () {
                mocks['node:fs/promises'].rm.rejects();
              });

              it('should reject', async function () {
                await smoker.createTempDir();
                await expect(
                  smoker.cleanup(),
                  'to be rejected with error satisfying',
                  /Failed to clean temp directory/,
                );
              });
            });

            describe('when the failure is due to the non-existence of the temp directory', function () {
              beforeEach(function () {
                const err: NodeJS.ErrnoException = new Error();
                err.code = 'ENOENT';
                mocks['node:fs/promises'].rm.rejects(err);
              });

              it('should not reject', async function () {
                await smoker.createTempDir();
                await expect(smoker.cleanup(), 'to be fulfilled');
              });
            });
          });
        });

        describe('when the "linger" option is true and a temp dir was created', function () {
          beforeEach(async function () {
            smoker = Smoker.create(pms, {
              script: 'foo',
              linger: true,
            });
            await smoker.createTempDir();
          });

          it('should not attempt to prune the temp directories', async function () {
            await smoker.cleanup();
            await expect(mocks['node:fs/promises'].rm, 'was not called');
          });

          it('should emit the "Lingered" event', async function () {
            await expect(
              smoker.cleanup(),
              'to emit from',
              smoker,
              Event.LINGERED,
            );
          });
        });
      });

      describe('createTempDir()', function () {
        describe('when mkdtemp() is successful', function () {
          it('should return the path to the temp directory', async function () {
            await expect(
              smoker.createTempDir(),
              'to be fulfilled with',
              MOCK_TMPDIR,
            );
          });
        });

        describe('when mkdtemp() fails', function () {
          beforeEach(function () {
            mocks['node:fs/promises'].mkdtemp.rejects();
          });

          it('should reject', async function () {
            await expect(
              smoker.createTempDir(),
              'to be rejected with error satisfying',
              /Failed to create temp directory/i,
            );
          });
        });
      });

      describe('pack()', function () {
        it('should emit the "PackBegin" event', async function () {
          await expect(smoker.pack(), 'to emit from', smoker, Event.PACK_BEGIN);
        });

        describe('when packing succeeds', function () {
          it('should emit the "PackOk" event', async function () {
            await expect(smoker.pack(), 'to emit from', smoker, Event.PACK_OK);
          });
        });

        it('should return an InstallManifest object', async function () {
          const manifestMap = await smoker.pack();

          await expect([...manifestMap], 'to equal', [
            [
              mockPm,
              {
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
              },
            ],
          ]);
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
              Event.PACK_FAILED,
              new Error('uh oh'),
            );
          });
        });

        describe('install()', function () {
          let pkgInstallManifest: MS.PkgInstallManifest;

          beforeEach(function () {
            pkgInstallManifest = new Map([
              [
                mockPm,
                {
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
                },
              ],
            ]);
          });

          it('should emit the "InstallBegin" event', async function () {
            await expect(
              smoker.install(pkgInstallManifest),
              'to emit from',
              smoker,
              Event.INSTALL_BEGIN,
            );
          });

          it('should emit the "InstallOk" event', async function () {
            await expect(
              smoker.install(pkgInstallManifest),
              'to emit from',
              smoker,
              Event.INSTALL_OK,
            );
          });

          describe('when called without argument', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error invalid args
                smoker.install(),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_INVALIDARG'},
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
                    await smoker.install(pkgInstallManifest);
                  } catch {}
                },
                'to emit from',
                smoker,
                Event.INSTALL_FAILED,
                new Error('uh oh'),
              );
            });

            it('should reject', async function () {
              await expect(
                smoker.install(pkgInstallManifest),
                'to be rejected with error satisfying',
                new Error('uh oh'),
              );
            });
          });
        });

        describe('runScripts()', function () {
          let pkgRunManifest: MS.PkgRunManifest;

          beforeEach(function () {
            pkgRunManifest = new Map([
              [
                mockPm,
                new Set([
                  {
                    packedPkg: {
                      tarballFilepath: `${MOCK_TMPDIR}/bar.tgz`,
                      installPath: `${MOCK_TMPDIR}/node_modules/bar`,
                      pkgName: 'bar',
                    },
                    script: 'foo',
                  },
                  {
                    packedPkg: {
                      tarballFilepath: `${MOCK_TMPDIR}/baz.tgz`,
                      installPath: `${MOCK_TMPDIR}/node_modules/baz`,
                      pkgName: 'baz',
                    },
                    script: 'foo',
                  },
                ]),
              ],
            ]);
          });

          describe('when the arguments are correct', function () {
            it('should emit the "RunScriptsBegin" event', async function () {
              await expect(
                smoker.runScripts(pkgRunManifest),
                'to emit from',
                smoker,
                Event.RUN_SCRIPTS_BEGIN,
              );
            });

            it('should emit the "RunScriptBegin" event (for the first script)', async function () {
              await expect(
                smoker.runScripts(pkgRunManifest),
                'to emit from',
                smoker,
                Event.RUN_SCRIPT_BEGIN,
                {script: 'foo', pkgName: 'bar', total: 2, current: 0},
              );
            });
          });

          describe('when called without "pkgRunManifest" argument', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error invalid args
                smoker.runScripts(),
                'to be rejected with error satisfying',
                new TypeError('(runScripts) "pkgRunManifest" arg is required'),
              );
            });
          });

          describe('when the scripts succeed', function () {
            it('should emit the "RunScriptsOk" event', async function () {
              await expect(
                smoker.runScripts(pkgRunManifest),
                'to emit from',
                smoker,
                Event.RUN_SCRIPTS_OK,
                {
                  results: expect.it('to be an array'),
                  failed: 0,
                  passed: 2,
                },
              );
            });

            it('should emit the "RunScriptOk" event (for the first script)', async function () {
              // XXX: this emits twice; one for each package. the unexpected plugin
              // does not support this and only sees the first one
              await expect(
                smoker.runScripts(pkgRunManifest),
                'to emit from',
                smoker,
                Event.RUN_SCRIPT_OK,
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
                smoker.runScripts(pkgRunManifest),
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
                smoker.runScripts(pkgRunManifest),
                'to be rejected with error satisfying',
                {code: 'ESMOKER_PACKAGEMANAGER', cause: {pmId: MOCK_PM_ID}},
              );
            });
          });

          describe('when a script fails', function () {
            let error: Errors.ScriptError;
            beforeEach(function () {
              error = new Errors.RunScriptError(
                'oh noes',
                'some-script',
                'bar',
                MOCK_PM_ID,
                {error: new Error()},
              );
              sandbox
                .stub(mockPm, 'runScript')
                .callThrough()
                .onFirstCall()
                .callsFake(async (runManifest) => {
                  return {
                    pkgName: runManifest.packedPkg.pkgName,
                    error,
                    script: runManifest.script,
                    rawResult: {} as MS.RawRunScriptResult,
                    cwd: '/some/path',
                  };
                });
            });

            it('should emit the "RunScriptFailed" event', async function () {
              await expect(
                smoker.runScripts(pkgRunManifest),
                'to emit from',
                smoker,
                Event.RUN_SCRIPT_FAILED,
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
                smoker.runScripts(pkgRunManifest),
                'to emit from',
                smoker,
                Event.RUN_SCRIPTS_FAILED,
                {
                  results: [
                    {pkgName: 'bar', error: expect.it('to be a', SmokerError)},
                    {pkgName: 'baz', error: undefined},
                  ],
                  failed: 1,
                  passed: 1,
                },
              );
            });

            describe('when the "bail" option is false', function () {
              beforeEach(function () {
                smoker = Smoker.create(pms, {
                  script: 'foo',
                  bail: false,
                });
              });

              it('should execute all scripts', async function () {
                await expect(
                  smoker.runScripts(pkgRunManifest),
                  'to be fulfilled with value satisfying',
                  [
                    {pkgName: 'bar', error},
                    {pkgName: 'baz', error: undefined},
                  ],
                );
              });
            });

            describe('when the "bail" option is true', function () {
              beforeEach(function () {
                smoker = Smoker.create(pms, {
                  script: 'foo',
                  bail: true,
                });
              });

              it('should execute only until a script fails', async function () {
                await expect(
                  smoker.runScripts(pkgRunManifest),
                  'to be fulfilled with value satisfying',
                  expect.it('to have length', 1),
                );
              });
            });
          });
        });
      });

      describe('smoke()', function () {
        describe('when provided scripts', function () {
          it('should pack, install, and run scripts', async function () {
            await expect(
              smoker.smoke(),
              'to be fulfilled with value satisfying',
              {
                scripts: [
                  {pkgName: 'bar', script: 'foo'},
                  {pkgName: 'baz', script: 'foo'},
                ],
              },
            );
          });
        });

        describe('when checks enabled', async function () {
          beforeEach(function () {
            smoker = Smoker.create(pms);
          });

          it('should run checks', async function () {
            await expect(
              smoker.smoke(),
              'to be fulfilled with value satisfying',
              {
                checks: {
                  passed: expect.it('to have items satisfying', {
                    rule: {
                      name: expect.it('to be a string'),
                      description: expect.it('to be a string'),
                    },
                    context: {
                      pkgJson: expect.it('to be an object'),
                      pkgJsonPath: expect.it('to be a string'),
                      pkgPath: expect.it('to be a string'),
                      severity: expect.it('to be one of', [
                        'error',
                        'warn',
                        'off',
                      ]),
                    },
                  }),
                },
              },
            );
          });
        });
      });
    });

    describe('static method', function () {
      describe('smoke()', function () {
        it('should pack, install, and run scripts', async function () {
          await expect(
            Smoker.smoke({script: 'foo'}),
            'to be fulfilled with value satisfying',
            {
              scripts: [
                {pkgName: 'bar', script: 'foo'},
                {pkgName: 'baz', script: 'foo'},
              ],
            },
          );
        });
      });

      describe('create()', function () {
        it('should throw if both non-empty "workspace" and true "all" options are provided', function () {
          expect(
            () => Smoker.create(pms, {workspace: ['foo'], all: true}),
            'to throw',
            /Option "workspace" is mutually exclusive with "all"/,
          );
        });

        describe('when not passed any scripts at all', function () {
          it('should not throw', function () {
            expect(() => Smoker.create(pms), 'not to throw');
          });
        });

        it('should return a Smoker instance', function () {
          expect(Smoker.create(pms), 'to be a', Smoker);
        });
      });
    });
  });
});
