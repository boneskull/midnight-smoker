import * as loaderUtil from '#util/importer';
import {Module} from 'node:module';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('loader-util', function () {
      let sandbox: sinon.SinonSandbox;

      beforeEach(function () {
        sandbox = createSandbox();
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('importTs()', function () {
        // E2E tests only for now
      });

      describe('justImport()', function () {
        // E2E tests only for now
      });

      describe('resolveFrom()', function () {
        it('should return resolved module path', function () {
          const moduleId = 'test-module-id';
          const fromDir = '/test-from-dir';
          const resolvedPath = '/test-resolved-path';

          sandbox.stub(Module, 'createRequire').returns({
            resolve: sandbox.stub().returns(resolvedPath),
          } as any);

          expect(
            loaderUtil.resolveFrom(moduleId, fromDir),
            'to be',
            resolvedPath,
          );
        });
      });
    });
  });
});
