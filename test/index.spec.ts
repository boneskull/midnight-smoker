import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import unexpectedEventEmitter from 'unexpected-eventemitter';
import {createSandbox} from 'sinon';
import rewiremock from 'rewiremock/node';
import path from 'node:path';
import type * as MS from 'midnight-smoker';
import type {PackItem} from 'midnight-smoker/types';
import {Readable} from 'node:stream';
import type {ExecaReturnValue} from 'execa';

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

type Mocks = {
  'node:fs/promises': NodeFsPromisesMocks;
  which: AsyncStub<string, string>;
  execa: AsyncStub<string, Partial<ExecaReturnValue>>;
  'node:console': sinon.SinonStubbedInstance<typeof console>;
  debug: sinon.SinonStub<any, sinon.SinonStub>;
  'node:os': {tmpdir: sinon.SinonStub<any, string>};
};

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;

  let Smoker: typeof MS.Smoker;

  let events: typeof MS.events;

  let smoke: typeof MS.smoke;

  let mocks: Mocks;

  const MOCK_NPM = '/some/path/to/npm';
  const MOCK_TMPROOT = '/some/tmp';
  const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

  let stderr: sinon.SinonStubbedInstance<Readable>;
  let stdout: sinon.SinonStubbedInstance<Readable>;

  beforeEach(function () {
    sandbox = createSandbox();

    mocks = {
      'node:fs/promises': {
        rm: sandbox.stub().resolves(),
        mkdtemp: sandbox.stub().resolves(MOCK_TMPDIR),
        mkdir: sandbox.stub().resolves(),
        stat: sandbox.stub().rejects(),
      },
      which: sandbox.stub().resolves(MOCK_NPM),
      execa: sandbox.stub().callsFake(() => {
        stdout = sandbox.createStubInstance(Readable);
        stderr = sandbox.createStubInstance(Readable);
        const promise = new Promise((resolve) => {
          setImmediate(() => {
            stdout.emit('data', 'output from npm');
            resolve({
              exitCode: 0,
              stdout: JSON.stringify([{filename: 'tarball.tgz', name: 'bar'}]),
            });
          });
        });
        Object.assign(promise, {stdout, stderr});
        return promise;
      }),
      'node:console': sandbox.stub(console),
      'node:os': {
        tmpdir: sandbox.stub().returns(MOCK_TMPROOT),
      },
      debug: sandbox.stub().returns(sandbox.stub()),
    };

    ({Smoker, smoke, events} = rewiremock.proxy(
      () => require('../src/index'),
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
          () => new Smoker([], {workspace: ['foo'], all: true}),
          'to throw',
          /Option "workspace" is mutually exclusive with "all" and\/or "includeRoot"/,
        );
      });

      describe('when option "includeRoot" is provided', function () {
        it('should set "all" option to true', function () {
          const smoker = new Smoker([], {includeRoot: true});
          expect(smoker.opts.all, 'to be', true);
        });
      });

      describe('when passed a string for "scripts" argument', function () {
        it('should not throw', function () {
          expect(() => new Smoker('foo'), 'not to throw');
        });
      });
    });

    describe('method', function () {
      let smoker: import('midnight-smoker').Smoker;

      beforeEach(function () {
        smoker = new Smoker('foo');
      });

      describe('cleanup()', function () {
        describe('when `createWorkingDirectory()` has not yet been called', function () {
          it('should not attempt to prune the working directory', async function () {
            await smoker.cleanup();
            return expect(mocks['node:fs/promises'].rm, 'was not called');
          });
        });

        describe('when `createWorkingDirectory() has been successfully called', function () {
          it('should attempt to prune the working directory', async function () {
            await smoker.createWorkingDirectory();
            await smoker.cleanup();
            return expect(mocks['node:fs/promises'].rm, 'was called once');
          });

          describe('when it fails to prune the working directory', function () {
            describe('when the failure is not due to the non-existence of the working directory', function () {
              beforeEach(function () {
                mocks['node:fs/promises'].rm.rejects();
              });

              it('should reject', async function () {
                await smoker.createWorkingDirectory();
                return expect(
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
                return expect(smoker.cleanup(), 'to be fulfilled');
              });
            });
          });
        });
      });

      describe('findNpm()', function () {
        beforeEach(function () {
          mocks.execa.resolves({exitCode: 0, stdout: '1.2.3'});
        });
        describe('when the "npm" option was provided to the constructor', function () {
          it('should return object containing trimmed value of the "npm" option', async function () {
            const smoker = new Smoker('foo', {npm: 'npm-path '});
            return expect(await smoker.findNpm(), 'to equal', {
              path: 'npm-path',
              version: '1.2.3',
            });
          });

          it('should emit the "FindNpmBegin" event to verify path & version', async function () {
            const smoker = new Smoker('foo', {npm: 'npm-path'});
            return expect(
              () => smoker.findNpm(),
              'to emit from',
              smoker,
              events.FIND_NPM_BEGIN,
            );
          });
        });

        describe('when the "npm" option was not provided to the constructor', function () {
          it('should look for an "npm" executable in the PATH', async function () {
            expect(smoker.findNpm(), 'to be fulfilled with', {
              path: MOCK_NPM,
              version: '1.2.3',
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
            return expect(
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
            return expect(
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
              smoker = new Smoker('foo', {dir: '/some/path/to/dir'});
            });

            describe('when the dir does not exist', function () {
              it('should assert the directory does not exist', async function () {
                await smoker.createWorkingDirectory();
                return expect(
                  mocks['node:fs/promises'].stat,
                  'was called once',
                );
              });

              it('should create the directory', async function () {
                await smoker.createWorkingDirectory();
                return expect(
                  mocks['node:fs/promises'].mkdir,
                  'was called once',
                );
              });

              it('should return the directory path', function () {
                return expect(
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
                  return expect(
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
                return expect(
                  smoker.createWorkingDirectory(),
                  'to be rejected with error satisfying',
                  /Working directory \/some\/path\/to\/dir already exists/,
                );
              });
            });
          });

          describe('when "force" option provided to constructor', function () {
            beforeEach(function () {
              smoker = new Smoker('foo', {
                dir: '/some/path/to/dir',
                force: true,
              });
            });

            it('should not assert the directory exists', async function () {
              await smoker.createWorkingDirectory();
              return expect(mocks['node:fs/promises'].stat, 'was not called');
            });

            describe('when "clean" option is provided to constructor', function () {
              beforeEach(function () {
                smoker = new Smoker('foo', {
                  dir: '/some/path/to/dir',
                  force: true,
                  clean: true,
                });
              });

              it('should clean the directory', async function () {
                await smoker.createWorkingDirectory();
                return expect(mocks['node:fs/promises'].rm, 'was called once');
              });
            });
          });
        });
      });

      describe('pack()', function () {
        it('should emit the "PackBegin" event', async function () {
          return expect(
            smoker.pack(),
            'to emit from',
            smoker,
            events.PACK_BEGIN,
          );
        });

        it('should emit the "PackOk" event', async function () {
          return expect(smoker.pack(), 'to emit from', smoker, events.PACK_OK);
        });

        it('should return an array of PackItem objects', async function () {
          const packItems = await smoker.pack();
          return expect(packItems, 'to equal', [
            {
              tarballFilepath: `${MOCK_TMPDIR}/tarball.tgz`,
              installPath: `${MOCK_TMPDIR}/node_modules/bar`,
            },
          ]);
        });

        describe('when "workspace" option provided to constructor', function () {
          beforeEach(function () {
            smoker = new Smoker('foo', {
              workspace: ['/some/path/to/workspace'],
            });
          });

          it('should append the "--workspace" flag to "npm pack"', async function () {
            await smoker.pack();
            expect(mocks.execa, 'was called with', MOCK_NPM, [
              'pack',
              '--json',
              `--pack-destination=${MOCK_TMPDIR}`,
              '--foreground-scripts=false',
              '--workspace=/some/path/to/workspace',
            ]);
          });
        });

        describe('when the "all" option is provided to the constructor', function () {
          beforeEach(function () {
            smoker = new Smoker('foo', {
              all: true,
            });
          });

          it('should append the "--workspaces" flag to "npm pack"', async function () {
            await smoker.pack();
            expect(mocks.execa, 'was called with', MOCK_NPM, [
              'pack',
              '--json',
              `--pack-destination=${MOCK_TMPDIR}`,
              '--foreground-scripts=false',
              '--workspaces',
            ]);
          });

          describe('when the "includeRoot" option is provided to the constructor', function () {
            beforeEach(function () {
              smoker = new Smoker('foo', {
                all: true,
                includeRoot: true,
              });
            });

            it('should append the "--include-workspace-root" flag to "npm pack"', async function () {
              await smoker.pack();
              expect(mocks.execa, 'was called with', MOCK_NPM, [
                'pack',
                '--json',
                `--pack-destination=${MOCK_TMPDIR}`,
                '--foreground-scripts=false',
                '--workspaces',
                '--include-workspace-root',
              ]);
            });
          });
        });

        describe('when `npm pack` fails', function () {
          beforeEach(async function () {
            mocks.execa.resolves({exitCode: 1, stdout: ''});
          });

          it('should reject', async function () {
            return expect(
              smoker.pack(),
              'to be rejected with error satisfying',
              /"npm pack" failed/,
            );
          });

          it('should emit the "PackFailed" event', async function () {
            return expect(
              async () => {
                try {
                  await smoker.pack();
                } catch {}
              },
              'to emit from',
              smoker,
              events.PACK_FAILED,
              /"npm pack" failed/,
            );
          });
        });

        describe('when in "verbose" mode', function () {
          beforeEach(async function () {
            smoker = new Smoker('foo', {verbose: true});
            await smoker.pack();
          });
          it('should pipe to STDOUT', function () {
            expect(stdout.pipe, 'was called once');
          });
          it('should pipe to STDERR', function () {
            expect(stderr.pipe, 'was called once');
          });
        });

        describe('when not in "verbose" mode', function () {
          beforeEach(async function () {
            await smoker.pack();
          });
          it('should not pipe to STDERR', function () {
            expect(stderr.pipe, 'was not called');
          });

          it('should not pipe to STDOUT', function () {
            expect(stdout.pipe, 'was not called');
          });
        });

        describe('when "npm pack" returns invalid JSON', function () {
          beforeEach(function () {
            mocks.execa.resolves({exitCode: 0, stdout: '[invalid'});
          });
          it('should reject', async function () {
            return expect(
              smoker.pack(),
              'to be rejected with error satisfying',
              /Failed to parse JSON output/,
            );
          });

          it('should emit the "PackFailed" event', async function () {
            return expect(
              async () => {
                try {
                  await smoker.pack();
                } catch {}
              },
              'to emit from',
              smoker,
              events.PACK_FAILED,
              /Failed to parse JSON output/,
            );
          });
        });
      });

      describe('install()', function () {
        const packItems: PackItem[] = [
          {
            tarballFilepath: `${MOCK_TMPDIR}/bar.tgz`,
            installPath: `${MOCK_TMPDIR}/node_modules/bar`,
          },
          {
            tarballFilepath: `${MOCK_TMPDIR}/baz.tgz`,
            installPath: `${MOCK_TMPDIR}/node_modules/baz`,
          },
        ];

        it('should execute "npm install" with a list of tarball filepaths', async function () {
          await smoker.install(packItems);
          expect(mocks.execa, 'to have a call satisfying', [
            MOCK_NPM,
            [
              'install',
              '--install-strategy=shallow',
              ...packItems.map((item) => item.tarballFilepath),
            ],
            {},
          ]);
        });

        it('should emit the "InstallBegin" event', async function () {
          return expect(
            smoker.install(packItems),
            'to emit from',
            smoker,
            events.INSTALL_BEGIN,
            packItems,
          );
        });

        it('should emit the "InstallOk" event', async function () {
          return expect(
            smoker.install(packItems),
            'to emit from',
            smoker,
            events.INSTALL_OK,
            packItems,
          );
        });

        describe('when called without "packItems" argument', function () {
          it('should reject', async function () {
            return expect(
              // @ts-expect-error invalid args
              smoker.install(),
              'to be rejected with error satisfying',
              new TypeError('(install) "packItems" is required'),
            );
          });
        });

        describe('when "npm install" returns a non-zero exit code', function () {
          beforeEach(function () {
            mocks.execa.resolves({exitCode: 1, stdout: 'oh noes'});
          });

          it('should reject', async function () {
            return expect(
              smoker.install(packItems),
              'to be rejected with error satisfying',
              /"npm install" failed with exit code 1/,
            );
          });
        });

        describe('when "npm" cannot be executed', function () {
          beforeEach(function () {
            mocks.execa.onFirstCall().resolves({stdout: '8.0.0'});
            mocks.execa.onSecondCall().rejects(new Error('yack'));
          });

          it('should reject', async function () {
            return expect(
              smoker.install(packItems),
              'to be rejected with error satisfying',
              /"npm install" failed to spawn/,
            );
          });
        });

        describe('when "packItems" argument is empty', function () {
          it('should not execute "npm install"', async function () {
            await smoker.install([]);
            expect(mocks.execa, 'was not called');
          });
        });

        describe('when in "verbose" mode', function () {
          beforeEach(async function () {
            smoker = new Smoker('foo', {verbose: true});
            await smoker.install(packItems);
          });
          it('should pipe to STDOUT', function () {
            expect(stdout.pipe, 'was called once');
          });
          it('should pipe to STDERR', function () {
            expect(stderr.pipe, 'was called once');
          });
        });

        describe('when not in "verbose" mode', function () {
          beforeEach(async function () {
            await smoker.install(packItems);
          });
          it('should not pipe to STDERR', function () {
            expect(stderr.pipe, 'was not called');
          });

          it('should not pipe to STDOUT', function () {
            expect(stdout.pipe, 'was not called');
          });
        });
      });

      describe('runScripts()', function () {
        const packItems: PackItem[] = [
          {
            tarballFilepath: `${MOCK_TMPDIR}/bar.tgz`,
            installPath: `${MOCK_TMPDIR}/node_modules/bar`,
          },
          {
            tarballFilepath: `${MOCK_TMPDIR}/baz.tgz`,
            installPath: `${MOCK_TMPDIR}/node_modules/baz`,
          },
        ];

        it('should emit the "RunScriptsBegin" event', async function () {
          return expect(
            smoker.runScripts(packItems),
            'to emit from',
            smoker,
            events.RUN_SCRIPTS_BEGIN,
            {scripts: ['foo'], packItems, total: 2},
          );
        });

        it('should emit the "RunScriptsOk" event', async function () {
          return expect(
            smoker.runScripts(packItems),
            'to emit from',
            smoker,
            events.RUN_SCRIPTS_OK,
            expect.it('to satisfy', {
              scripts: ['foo'],
              total: 2,
              executed: 2,
              failures: 0,
              results: expect.it('to be an array'),
            }),
          );
        });

        describe('when called without "packItems" argument', function () {
          it('should reject', async function () {
            return expect(
              // @ts-expect-error invalid args
              smoker.runScripts(),
              'to be rejected with error satisfying',
              new TypeError('(install) "packItems" is required'),
            );
          });
        });

        describe('when "packItems" argument is empty', function () {
          it('should not execute "npm run-script"', async function () {
            await smoker.runScripts([]);
            expect(mocks.execa, 'was called once'); // version check
          });
        });

        describe('when in "verbose" mode', function () {
          beforeEach(async function () {
            smoker = new Smoker('foo', {verbose: true});
            await smoker.runScripts(packItems);
          });
          it('should pipe to STDOUT', async function () {
            expect(stdout.pipe, 'was called once');
          });
          it('should pipe to STDERR', async function () {
            expect(stderr.pipe, 'was called once');
          });
        });

        describe('when not in "verbose" mode', function () {
          beforeEach(async function () {
            await smoker.runScripts(packItems);
          });

          it('should not pipe to STDERR', async function () {
            expect(stderr.pipe, 'was not called');
          });

          it('should not pipe to STDOUT', async function () {
            expect(stdout.pipe, 'was not called');
          });
        });

        it('should call "npm run-script" within each "installPath" in "packItems"', async function () {
          await smoker.runScripts(packItems);
          expect(mocks.execa, 'to have calls satisfying', [
            [MOCK_NPM, ['--version']],
            [MOCK_NPM, ['run-script', 'foo'], {cwd: packItems[0].installPath}],
            [MOCK_NPM, ['run-script', 'foo'], {cwd: packItems[1].installPath}],
          ]);
        });

        describe('when a script fails', function () {
          it('should emit the "RunScriptsFailed" event');
        });

        describe('when constructor provided "bail" option', function () {
          beforeEach(function () {
            smoker = new Smoker('foo', {bail: true});
          });
          describe('when "npm run-script" fails', function () {
            beforeEach(function () {
              mocks.execa.resolves({
                exitCode: 1,
                stderr: 'oh noes',
                failed: true,
              });
            });

            it('should reject', async function () {
              return expect(
                smoker.runScripts(packItems),
                'to be rejected with error satisfying',
                /failed with exit code 1/,
              );
            });

            describe('when the script does not exist', function () {
              beforeEach(function () {
                mocks.execa.resolves({
                  exitCode: 1,
                  stderr: 'Missing script: "foo"',
                  failed: true,
                });
              });

              it('should reject', async function () {
                return expect(
                  smoker.runScripts(packItems),
                  'to be rejected with error satisfying',
                  /npm was unable to find this script/,
                );
              });
            });
          });
        });
      });
    });
  });

  describe('smoke()', function () {
    let globalStyleFlag: string;

    beforeEach(async function () {
      const smoker = new Smoker('foo');
      const {version} = await smoker.findNpm();
      globalStyleFlag =
        version.startsWith('7') || version.startsWith('8')
          ? '--global-style'
          : '--install-strategy=shallow';
      mocks.execa.resetHistory();
    });

    it('should pack, install, and run scripts', async function () {
      await smoke('foo');
      expect(mocks.execa, 'to have calls satisfying', [
        [MOCK_NPM, ['--version']],
        [
          MOCK_NPM,
          [
            'pack',
            '--json',
            `--pack-destination=${MOCK_TMPDIR}`,
            '--foreground-scripts=false',
          ],
          {},
        ],
        [
          MOCK_NPM,
          ['install', globalStyleFlag, `${MOCK_TMPDIR}/tarball.tgz`],
          {cwd: MOCK_TMPDIR},
        ],
        [
          MOCK_NPM,
          ['run-script', 'foo'],
          {cwd: `${MOCK_TMPDIR}/node_modules/bar`},
        ],
      ]);
    });
  });
});
