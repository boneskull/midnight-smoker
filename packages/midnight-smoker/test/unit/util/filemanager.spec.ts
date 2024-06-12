import {FileManager} from '#util/filemanager';
import {type NormalizedPackageJson} from '#util/fs-api';
import {type Volume} from 'memfs/lib/volume';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createFsMocks} from '../mocks/fs';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  let sandbox: sinon.SinonSandbox;
  let vol: Volume;

  beforeEach(async function () {
    sandbox = sinon.createSandbox();
    ({vol} = createFsMocks());
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('util', function () {
    describe('FileManager', function () {
      let fm: FileManager;

      describe('instance method', function () {
        beforeEach(function () {
          fm = new FileManager({
            fs: vol as any,
            tmpdir: () => '/',
          });
        });

        describe('createTempDir()', function () {
          describe('when successful', function () {
            it('should return the path to the temp directory', async function () {
              await expect(
                fm.createTempDir(),
                'to be fulfilled with value satisfying',
                expect.it('to be a string'),
              );
            });
          });

          describe('when failing', function () {
            beforeEach(function () {
              sandbox
                .stub(vol.promises, 'mkdtemp')
                .rejects(Object.assign(new Error('foo'), {code: 'DERP'}));
            });

            it('should reject', async function () {
              await expect(
                fm.createTempDir(),
                'to be rejected with error satisfying',
                {code: 'DERP'},
              );
            });
          });
        });

        describe('pruneTempDir()', function () {
          const {signal} = new AbortController();
          it('should not prune a dir it did not create', async function () {
            const dir = '/some/dir';
            sandbox.stub(fm, 'rimraf');
            await fm.pruneTempDir(dir);
            expect(fm.rimraf, 'was not called');
          });

          it('should prune a dir it created', async function () {
            const dir = await fm.createTempDir('', signal);
            sandbox.stub(fm, 'rimraf');
            await fm.pruneTempDir(dir, signal);
            expect(fm.rimraf, 'to have a call satisfying', [dir, signal]);
          });

          describe('when rimraf rejects', function () {
            it('should eat the error', async function () {
              const dir = await fm.createTempDir('', signal);
              sandbox.stub(fm, 'rimraf').rejects(new Error('foo'));
              await expect(fm.pruneTempDir(dir, signal), 'to be fulfilled');
              expect(fm.rimraf, 'to have a call satisfying', [dir, signal]);
            });
          });
        });

        describe('readSmokerPkgJson()', function () {
          it('should call findPkgUp with the correct args', async function () {
            const packageJson = {
              name: 'midnight-smoker',
            } as NormalizedPackageJson;
            sandbox
              .stub(fm, 'findPkgUp')
              .resolves({packageJson, path: 'pookage.json'});
            await expect(
              fm.readSmokerPkgJson(),
              'to be fulfilled with',
              packageJson,
            );
            expect(fm.findPkgUp, 'was called once');
          });

          it.skip('should cache the result, per instance', async function () {
            const packageJson = {
              name: 'midnight-smoker',
            } as NormalizedPackageJson;
            sandbox
              .stub(fm, 'findPkgUp')
              .resolves({packageJson, path: 'pookage.json'});
            await expect(
              fm.readSmokerPkgJson(),
              'to be fulfilled with',
              packageJson,
            );
            await expect(
              fm.readSmokerPkgJson(),
              'to be fulfilled with',
              packageJson,
            );
            expect(fm.findPkgUp, 'was called once');
          });
        });

        describe('rimraf()', function () {
          beforeEach(function () {
            sandbox.stub(vol.promises, 'rm');
          });

          it('should call fs.rm with the correct args', async function () {
            const dir = '/some/dir';
            await fm.rimraf(dir);
            expect(vol.promises.rm, 'to have a call satisfying', [
              dir,
              {recursive: true, force: true},
            ]);
          });
        });

        describe('readPkgJson()', function () {
          it('should be tested');
        });

        describe('findPkgUp()', function () {
          it('should be tested');
        });

        describe('findUp()', function () {
          beforeEach(async function () {
            vol.fromNestedJSON({
              '/': {
                'package.json': JSON.stringify({name: 'foo', version: '1.0.0'}),
                foo: {
                  'someFile.txt': '',
                },
              },
            });
          });

          it('should find a file in an ancestor directory', async function () {
            const filename = 'package.json';
            const from = '/foo/';
            const result = await fm.findUp(filename, from);
            expect(result, 'to equal', '/package.json');
          });

          describe('when no such file exists', function () {
            it('should resolve with undefined', async function () {
              const from = '/foo/';
              const result = await fm.findUp('bludd', from);
              expect(result, 'to be undefined');
            });
          });

          describe('when "filename" is a directory', function () {
            it('should resolve with undefined', async function () {
              const from = '/foo/';
              const result = await fm.findUp('foo', from);
              expect(result, 'to be undefined');
            });
          });

          describe('when "from" is a filename', function () {
            it('should find a file in an ancestor directory', async function () {
              const filename = 'package.json';
              const from = '/foo/someFile.txt';
              const result = await fm.findUp(filename, from);
              expect(result, 'to equal', '/package.json');
            });
          });
        });
      });
    });
  });
});
