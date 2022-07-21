const unexpected = require('unexpected');
const {createSandbox} = require('sinon');
const expect = unexpected.clone().use(require('unexpected-sinon'));
const rewiremock = require('rewiremock/node');
const EventEmitter = require('events');
const path = require('path');

describe('midnight-smoker', function () {
  /** @type {sinon.SinonSandbox} */
  let sandbox;

  /** @type {typeof import('midnight-smoker').Smoker} */
  let Smoker;

  /** @type {typeof import('midnight-smoker').smoke} */
  let smoke;

  /** @type {Mocks} */
  let mocks;

  const MOCK_NPM = '/some/path/to/npm';
  const MOCK_TMPROOT = '/some/tmp';
  const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

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
      execa: {
        node: sandbox.stub().callsFake(() => {
          const stdout = new EventEmitter();
          const promise = new Promise((resolve) => {
            setImmediate(() => {
              stdout.emit('data', 'output from npm');
              resolve({
                exitCode: 0,
                stdout: JSON.stringify([
                  {filename: 'tarball.tgz', name: 'bar'},
                ]),
              });
            });
          });
          Object.assign(promise, {stdout});
          return promise;
        }),
      },
      'node:console': sandbox.stub(console),
      'node:os': {
        tmpdir: sandbox.stub().returns(MOCK_TMPROOT),
      },
      debug: sandbox.stub().returns(sandbox.stub()),
    };

    ({Smoker, smoke} = rewiremock.proxy(() => require('../src/index'), mocks));
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
          /Option "workspace" is mutually exclusive with "all" and\/or "includeRoot"/
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
      /** @type {import('midnight-smoker').Smoker} */
      let smoker;

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
                  /Failed to clean working directory/
                );
              });
            });

            describe('when the failure is due to the non-existence of the working directory', function () {
              beforeEach(function () {
                /** @type {NodeJS.ErrnoException} */
                const err = new Error();
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
        describe('when the "npm" option was provided to the constructor', function () {
          it('should return the trimmed value of the "npm" option', async function () {
            const smoker = new Smoker('foo', {npm: 'npm-path '});
            return expect(await smoker.findNpm(), 'to be', 'npm-path');
          });
        });

        describe('when the "npm" option was not provided to the constructor', function () {
          it('should look for an "npm" executable in the PATH', async function () {
            expect(smoker.findNpm(), 'to be fulfilled with', MOCK_NPM);
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
              /Failed to create temporary working directory/
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
              MOCK_TMPDIR
            );
          });
        });

        describe('when explicit "dir" option provided to constructor', function () {
          /** @type {import('midnight-smoker').Smoker} */
          let smoker;

          describe('when "force" option not provided to constructor', function () {
            beforeEach(function () {
              smoker = new Smoker('foo', {dir: '/some/path/to/dir'});
            });

            describe('when the dir does not exist', function () {
              it('should assert the directory does not exist', async function () {
                await smoker.createWorkingDirectory();
                return expect(
                  mocks['node:fs/promises'].stat,
                  'was called once'
                );
              });

              it('should create the directory', async function () {
                await smoker.createWorkingDirectory();
                return expect(
                  mocks['node:fs/promises'].mkdir,
                  'was called once'
                );
              });

              it('should return the directory path', function () {
                return expect(
                  smoker.createWorkingDirectory(),
                  'to be fulfilled with',
                  '/some/path/to/dir'
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
                    /Failed to create working directory/
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
                  /Working directory \/some\/path\/to\/dir already exists/
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
            expect(mocks.execa.node, 'was called with', MOCK_NPM, [
              'pack',
              '--json',
              `--pack-destination=${MOCK_TMPDIR}`,
              '--foreground-scripts=false',
              '--silent',
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
            expect(mocks.execa.node, 'was called with', MOCK_NPM, [
              'pack',
              '--json',
              `--pack-destination=${MOCK_TMPDIR}`,
              '--foreground-scripts=false',
              '--silent',
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
              expect(mocks.execa.node, 'was called with', MOCK_NPM, [
                'pack',
                '--json',
                `--pack-destination=${MOCK_TMPDIR}`,
                '--foreground-scripts=false',
                '--silent',
                '--workspaces',
                '--include-workspace-root',
              ]);
            });
          });
        });

        describe('when `npm pack` fails', function () {
          beforeEach(async function () {
            mocks.execa.node.resolves({exitCode: 1, stdout: ''});
          });

          it('should reject', async function () {
            return expect(
              smoker.pack(),
              'to be rejected with error satisfying',
              /"npm pack" failed/
            );
          });
        });

        describe('when in "quiet" mode', function () {
          beforeEach(function () {
            smoker = new Smoker('foo', {quiet: true});
          });
          it('should not log "npm" output to STDERR', async function () {
            await smoker.pack();
            expect(mocks['node:console'].error, 'was not called');
          });
        });

        describe('when not in "quiet" mode', function () {
          it('should log "npm" output to STDERR', async function () {
            await smoker.pack();
            expect(
              mocks['node:console'].error,
              'was called with',
              'output from npm'
            );
          });
        });

        describe('when "npm pack" returns invalid JSON', function () {
          beforeEach(function () {
            mocks.execa.node.resolves({exitCode: 0, stdout: '[invalid'});
          });
          it('should reject', async function () {
            return expect(
              smoker.pack(),
              'to be rejected with error satisfying',
              /Failed to parse JSON output/
            );
          });
        });
      });

      describe('install()', function () {
        /** @type {import('midnight-smoker').PackItem[]} */
        const packItems = [
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
          expect(mocks.execa.node, 'was called with', MOCK_NPM, [
            'install',
            ...packItems.map((item) => item.tarballFilepath),
          ]);
        });

        describe('when called without "packItems" argument', function () {
          it('should reject', async function () {
            return expect(
              // @ts-expect-error
              smoker.install(),
              'to be rejected with error satisfying',
              new TypeError('(install) "packItems" is required')
            );
          });
        });

        describe('when "npm install" returns a non-zero exit code', function () {
          beforeEach(function () {
            mocks.execa.node.resolves({exitCode: 1, stdout: 'oh noes'});
          });

          it('should reject', async function () {
            return expect(
              smoker.install(packItems),
              'to be rejected with error satisfying',
              /"npm install" failed with exit code 1/
            );
          });
        });

        describe('when "packItems" argument is empty', function () {
          it('should not execute "npm install"', async function () {
            await smoker.install([]);
            expect(mocks.execa.node, 'was not called');
          });
        });

        describe('when in "quiet" mode', function () {
          beforeEach(function () {
            smoker = new Smoker('foo', {quiet: true});
          });
          it('should not log "npm" output to STDERR', async function () {
            await smoker.install(packItems);
            expect(mocks['node:console'].error, 'was not called');
          });
        });

        describe('when not in "quiet" mode', function () {
          it('should log "npm" output to STDERR', async function () {
            await smoker.install(packItems);
            expect(
              mocks['node:console'].error,
              'was called with',
              'output from npm'
            );
          });
        });
      });

      describe('runScript()', function () {
        /** @type {import('midnight-smoker').PackItem[]} */
        const packItems = [
          {
            tarballFilepath: `${MOCK_TMPDIR}/bar.tgz`,
            installPath: `${MOCK_TMPDIR}/node_modules/bar`,
          },
          {
            tarballFilepath: `${MOCK_TMPDIR}/baz.tgz`,
            installPath: `${MOCK_TMPDIR}/node_modules/baz`,
          },
        ];

        describe('when called without "packItems" argument', function () {
          it('should reject', async function () {
            return expect(
              // @ts-expect-error
              smoker.runScript(),
              'to be rejected with error satisfying',
              new TypeError('(install) "packItems" is required')
            );
          });
        });

        describe('when "packItems" argument is empty', function () {
          it('should not execute "npm run-script"', async function () {
            await smoker.runScript([]);
            expect(mocks.execa.node, 'was not called');
          });
        });

        describe('when in "quiet" mode', function () {
          beforeEach(function () {
            smoker = new Smoker('foo', {quiet: true});
          });
          it('should not log "npm" output to STDERR', async function () {
            await smoker.runScript(packItems);
            expect(mocks['node:console'].error, 'was not called');
          });
        });

        describe('when not in "quiet" mode', function () {
          it('should log "npm" output to STDERR', async function () {
            await smoker.runScript(packItems);
            expect(
              mocks['node:console'].error,
              'was called with',
              'output from npm'
            );
          });
        });

        it('should call "npm run-script" within each "installPath" in "packItems"', async function () {
          await smoker.runScript(packItems);
          expect(mocks.execa.node, 'to have calls satisfying', [
            [MOCK_NPM, ['run-script', 'foo'], {cwd: packItems[0].installPath}],
            [MOCK_NPM, ['run-script', 'foo'], {cwd: packItems[1].installPath}],
          ]);
        });

        describe('when "npm install" fails', function () {
          beforeEach(function () {
            mocks.execa.node.resolves({exitCode: 1, stderr: 'oh noes'});
          });
          it('should reject', async function () {
            return expect(
              smoker.runScript(packItems),
              'to be rejected with error satisfying',
              /npm script "foo" failed with exit code 1/
            );
          });

          describe('when the script does not exist', function () {
            beforeEach(function () {
              mocks.execa.node.resolves({
                exitCode: 1,
                stderr: 'Missing script: "foo"',
              });
            });

            it('should reject', async function () {
              return expect(
                smoker.runScript(packItems),
                'to be rejected with error satisfying',
                /npm was unable to find script "foo" in package "bar"/
              );
            });
          });
        });
      });
    });
  });

  describe('smoke()', function () {
    it('should pack, install, and run scripts', async function () {
      await smoke('foo');
      expect(mocks.execa.node, 'to have calls satisfying', [
        [
          MOCK_NPM,
          [
            'pack',
            '--json',
            `--pack-destination=${MOCK_TMPDIR}`,
            '--foreground-scripts=false',
            '--silent',
          ],
        ],
        [
          MOCK_NPM,
          ['install', `${MOCK_TMPDIR}/tarball.tgz`],
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

/**
 * @template {Readonly<any>} [TArgs=any]
 * @template [TReturnValue=any]
 * @typedef {sinon.SinonStub<TArgs[], Promise<TReturnValue>>} AsyncStub
 */

/**
 * @typedef NodeFsPromisesMocks
 * @property {AsyncStub<any,string>} mkdtemp
 * @property {AsyncStub} rm
 * @property {AsyncStub} mkdir
 * @property {AsyncStub} stat
 */

/**
 * @typedef { {'node:fs/promises': NodeFsPromisesMocks, which: AsyncStub<any,string>, execa: {node: AsyncStub<any,Partial<import('execa').ExecaReturnValue>>}, 'node:console': sinon.SinonStubbedInstance<console>, debug: sinon.SinonStub<any,sinon.SinonStub>, 'node:os': {tmpdir: sinon.SinonStub<any,string>} } } Mocks
 */
