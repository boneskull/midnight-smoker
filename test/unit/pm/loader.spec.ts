import {parse} from 'semver';
import rewiremock from 'rewiremock/node';
import unexpected from 'unexpected';
import type {initLoader as _initLoader} from '../../../src/pm/loader';
import type {normalizeVersion as _normalizeVersion} from '../../../src/pm/version';
import {createSandbox} from 'sinon';
import {NullPm, nullPmModule} from '../mocks';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('package manager', function () {
    describe('loader', function () {
      let sandbox: sinon.SinonSandbox;
      let initLoader: typeof _initLoader;
      let versionStub: {
        normalizeVersion: sinon.SinonStubbedMember<typeof _normalizeVersion>;
      };

      beforeEach(function () {
        sandbox = createSandbox();
        versionStub = {
          normalizeVersion: sandbox.stub<[string, string?]>().resolvesArg(1),
        };

        ({initLoader} = rewiremock.proxy(
          () => require('../../../src/pm/loader'),
          {
            '../../../src/pm/version': versionStub,
          },
        ));
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('initLoader()', function () {
        it('should return a function', function () {
          expect(initLoader(), 'to be a function');
        });

        describe('loadPackageManagers()', function () {
          let loadPackageManagers: ReturnType<typeof initLoader>;

          beforeEach(function () {
            loadPackageManagers = initLoader([nullPmModule]);
          });

          describe('when provided a version within the accepted range', function () {
            beforeEach(function () {
              versionStub.normalizeVersion.resetBehavior();
              versionStub.normalizeVersion.resolves(parse('1.0.0')!);
            });

            it('should load the package manager', async function () {
              const pmMap = await loadPackageManagers(['nullpm@1']);
              expect(pmMap.get('nullpm@1.0.0'), 'to be a', NullPm);
            });
          });

          describe('when provided a version outside of the accepted range', function () {
            beforeEach(function () {
              versionStub.normalizeVersion.resetBehavior();
              versionStub.normalizeVersion.resolves(parse('3.0.0')!);
            });

            it('should reject', async function () {
              await expect(
                loadPackageManagers(['nullpm@3']),
                'to be rejected with error satisfying',
                /no package manager found/i,
              );
            });
          });
        });
      });
    });
  });
});
