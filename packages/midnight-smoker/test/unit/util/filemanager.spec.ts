import type * as FM from '#util/filemanager';
import {type IFs} from 'memfs';
import os from 'node:os';
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
import {createFsMocks} from '../mocks/fs';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  let FileManager: typeof FM.FileManager;
  let sandbox: sinon.SinonSandbox;
  let fs: IFs;

  beforeEach(async function () {
    sandbox = sinon.createSandbox();
    const {mocks, fs: _fs} = createFsMocks();
    fs = _fs;

    ({FileManager} = rewiremock.proxy(
      () => require('../../../src/util/filemanager'),
      mocks,
    ));

    // mock fs needs the tmpdir root
    await fs.promises.mkdir(os.tmpdir(), {recursive: true});
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('util', function () {
    describe('FileManager', function () {
      describe('instance method', function () {
        let fm: FM.FileManager;

        beforeEach(function () {
          fm = new FileManager(fs.promises as any);
        });

        describe('createTempDir()', function () {
          describe('when mkdtemp() is successful', function () {
            it('should return the path to the temp directory', async function () {
              await expect(
                fm.createTempDir(),
                'to be fulfilled with value satisfying',
                expect.it('to be a string'),
              );
            });
          });

          describe('when mkdtemp() fails', function () {
            beforeEach(function () {
              sandbox
                .stub(fs.promises, 'mkdtemp')
                .rejects(Object.assign(new Error('foo'), {code: 'DERP'}));
            });

            it('should reject', async function () {
              await expect(
                fm.createTempDir(),
                'to be rejected with error satisfying',
                /Failed to create temp directory/i,
              );
            });
          });
        });

        describe('rimraf', function () {
          beforeEach(function () {
            sandbox.stub(fs.promises, 'rm');
          });

          it('should call fs.rm with the correct args', async function () {
            const dir = '/some/dir';
            await fm.rimraf(dir);
            expect(fs.promises.rm, 'to have a call satisfying', [
              dir,
              {recursive: true, force: true},
            ]);
          });
        });
      });
    });
  });
});
