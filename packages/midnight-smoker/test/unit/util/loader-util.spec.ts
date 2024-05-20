import {createSandbox} from 'sinon';
import ts from 'typescript';
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
        const directory = 'test-directory';
        const configFilePath = 'test-config-file-path';
        const config = {compilerOptions: {}};
        sandbox.stub(ts, 'findConfigFile').returns(configFilePath);
        sandbox.stub(ts, 'readConfigFile').returns({config});
        sandbox.stub(ts.sys, 'fileExists').returns(true);
      });

      describe('justImport', function () {
        // similar structure as above, create stubs for require, import, and loaderUtil.importTs
        // then call loaderUtil.justImport and verify the expected behavior
      });

      describe('isErsatzESModule', function () {
        it('should return true if value is an object with __esModule property', function () {
          // setup
          const value = {__esModule: true};

          // exercise
          const result = loaderUtil.isErsatzESModule(value);

          // verify
          expect(result).to.be.true;
        });

        it('should return false if value is not an object with __esModule property', function () {
          // setup
          const value = {notEsModule: true};

          // exercise
          const result = loaderUtil.isErsatzESModule(value);

          // verify
          expect(result).to.be.false;
        });
      });

      describe('resolveFrom', function () {
        it('should return resolved module path', function () {
          // setup
          const moduleId = 'test-module-id';
          const fromDir = 'test-from-dir';
          const resolvedPath = 'test-resolved-path';
          sandbox
            .stub(module, 'createRequire')
            .returns({resolve: sandbox.stub().returns(resolvedPath)});

          // exercise
          const result = loaderUtil.resolveFrom(moduleId, fromDir);

          // verify
          expect(result).to.equal(resolvedPath);
        });
      });
    });
  });
});
