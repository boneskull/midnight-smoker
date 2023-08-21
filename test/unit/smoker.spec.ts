import type * as MS from '../../src';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import unexpectedSinon from 'unexpected-sinon';
import {SmokerError} from '../../src/error';
import * as Mocks from './mocks';
import {CorepackExecutor} from '../../src/pm/corepack';
import type {mkdir, mkdtemp, rm, stat} from 'node:fs/promises';

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

  let Events: typeof MS.Events;

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
    pms.set('nullpm@1.0.0', mockPm);

    ({Smoker, smoke, Events} = rewiremock.proxy(
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
          () => new Smoker(pms, [], {workspace: ['foo'], all: true}),
          'to throw',
          /Option "workspace" is mutually exclusive with "all" and\/or "includeRoot"/,
        );
      });

      describe('when passed a string for "scripts" argument', function () {
        it('should not throw', function () {
          expect(() => new Smoker(pms, 'foo'), 'not to throw');
        });
      });

      describe('when not passed any scripts at all', function () {
        it('should not throw', function () {
          expect(() => new Smoker(pms), 'not to throw');
        });
      });
    });

    describe('method', function () {
      let smoker: MS.Smoker;

      beforeEach(function () {
        smoker = new Smoker(pms, 'foo');
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
            smoker = new Smoker(pms, 'foo', {linger: true});
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
              Events.LINGERED,
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
              /Failed to create temporary directory/i,
            );
          });
        });
      });

      describe('pack()', function () {
        it('should emit the "PackBegin" event', async function () {
          await expect(
            smoker.pack(),
            'to emit from',
            smoker,
            Events.PACK_BEGIN,
          );
        });

        describe('when packing succeeds', function () {
          it('should emit the "PackOk" event', async function () {
            await expect(smoker.pack(), 'to emit from', smoker, Events.PACK_OK);
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
              Events.PACK_FAILED,
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
              Events.INSTALL_BEGIN,
            );
          });

          it('should emit the "InstallOk" event', async function () {
            await expect(
              smoker.install(pkgInstallManifest),
              'to emit from',
              smoker,
              Events.INSTALL_OK,
            );
          });

          describe('when called without "pkgInstallManifest" argument', function () {
            it('should reject', async function () {
              await expect(
                // @ts-expect-error invalid args
                smoker.install(),
                'to be rejected with error satisfying',
                new TypeError(
                  '(install) Non-empty "pkgInstallManifest" arg is required',
                ),
              );
            });
          });

          describe('when "pkgInstallManifest" argument is empty', function () {
            it('should reject', async function () {
              await expect(
                smoker.install(new Map()),
                'to be rejected with error satisfying',
                new TypeError(
                  '(install) Non-empty "pkgInstallManifest" arg is required',
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
                    await smoker.install(pkgInstallManifest);
                  } catch {}
                },
                'to emit from',
                smoker,
                Events.INSTALL_FAILED,
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
                Events.RUN_SCRIPTS_BEGIN,
              );
            });

            it('should emit the "RunScriptBegin" event (for the first script)', async function () {
              await expect(
                smoker.runScripts(pkgRunManifest),
                'to emit from',
                smoker,
                Events.RUN_SCRIPT_BEGIN,
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
                Events.RUN_SCRIPTS_OK,
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
                Events.RUN_SCRIPT_OK,
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
                new SmokerError(
                  '(runScripts): Unknown failure from "nullpm@1.0.0" plugin: Error: oh noes',
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
                .callsFake(async (runManifest) => {
                  return {
                    pkgName: runManifest.packedPkg.pkgName,
                    error: err,
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
                Events.RUN_SCRIPT_FAILED,
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
                Events.RUN_SCRIPTS_FAILED,
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
                smoker = new Smoker(pms, 'foo', {bail: false});
              });

              it('should execute all scripts', async function () {
                await expect(
                  smoker.runScripts(pkgRunManifest),
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
                smoker = new Smoker(pms, 'foo', {bail: true});
              });

              it('should execute only until a script fails', async function () {
                await expect(
                  smoker.runScripts(pkgRunManifest),
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
            smoker = new Smoker(pms);
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
            Smoker.smoke('foo'),
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

      describe('init()', function () {
        it('should return a new Smoker instance', async function () {
          await expect(
            Smoker.init('foo'),
            'to be fulfilled with value satisfying',
            expect.it('to be a', Smoker),
          );
        });
      });
    });
  });
});
