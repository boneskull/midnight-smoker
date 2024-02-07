import type {PluginHelpers} from '#plugin';
import {type IFs} from 'memfs';
import os from 'node:os';
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';
import unexpected from 'unexpected';
import {createFsMocks} from '../mocks/fs';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  let Helpers: PluginHelpers;
  let sandbox: sinon.SinonSandbox;
  let fs: IFs;

  beforeEach(async function () {
    sandbox = sinon.createSandbox();
    const {mocks, fs: _fs} = createFsMocks();
    fs = _fs;

    ({Helpers} = rewiremock.proxy(
      () => require('../../../src/plugin/helpers'),
      mocks,
    ));

    // mock fs needs the tmpdir root
    await fs.promises.mkdir(os.tmpdir(), {recursive: true});
  });

  afterEach(function () {
    sandbox.restore();
  });

  describe('helpers', function () {
    describe('createTempDir()', function () {
      describe('when mkdtemp() is successful', function () {
        it('should return the path to the temp directory', async function () {
          await expect(
            Helpers.createTempDir(),
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
            Helpers.createTempDir(),
            'to be rejected with error satisfying',
            /Failed to create temp directory/i,
          );
        });
      });
    });
  });
});
