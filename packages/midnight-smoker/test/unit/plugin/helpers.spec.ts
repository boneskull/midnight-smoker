import type {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
import rewiremock from 'rewiremock/node';
import sinon from 'sinon';
import unexpected from 'unexpected';
import type * as H from '../../../src/plugin/helpers';

const expect = unexpected.clone();
const MOCK_TMPROOT = '/some/tmp';
const MOCK_TMPDIR = path.join(MOCK_TMPROOT, 'midnight-smoker-');

describe('midnight-smoker', function () {
  let Helpers: typeof H;
  let sandbox: sinon.SinonSandbox;
  let mkdtempStub: sinon.SinonStubbedMember<typeof mkdtemp>;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    mkdtempStub = sandbox
      .stub<Parameters<typeof mkdtemp>>()
      .resolves(MOCK_TMPDIR);
    Helpers = rewiremock.proxy(() => require('../../../src/plugin/helpers'), {
      'node:fs/promises': {
        mkdtemp: mkdtempStub,
      },
    });
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
            'to be fulfilled with',
            MOCK_TMPDIR,
          );
        });
      });

      describe('when mkdtemp() fails', function () {
        beforeEach(function () {
          mkdtempStub.rejects(Object.assign(new Error('foo'), {code: 'DERP'}));
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
