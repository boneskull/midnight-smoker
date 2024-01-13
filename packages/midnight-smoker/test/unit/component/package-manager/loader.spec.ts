import {NullPm, nullExecutor, nullPmModule} from '@midnight-smoker/test-util';
import rewiremock from 'rewiremock/node';
import {parse} from 'semver';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import type * as PMLoader from '../../../../src/component/package-manager/loader';
import type * as Version from '../../../../src/component/package-manager/version';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('component', function () {
    describe('package manager', function () {
      describe('loader', function () {
        let sandbox: sinon.SinonSandbox;
        let loadPackageManagers: typeof PMLoader.loadPackageManagers;
        let versionStub: {
          normalizeVersion: sinon.SinonStubbedMember<
            typeof Version.normalizeVersion
          >;
        };

        beforeEach(function () {
          sandbox = createSandbox();
          versionStub = {
            normalizeVersion: sandbox.stub<[string, string?]>().returnsArg(1),
          };

          ({loadPackageManagers} = rewiremock.proxy(
            () => require('../../../../src/component/package-manager/loader'),
            {
              '../../../../src/component/package-manager/version': versionStub,
            },
          ));
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('loadPackageManagers()', function () {
          describe('when provided a version within the accepted range', function () {
            beforeEach(function () {
              versionStub.normalizeVersion.resetBehavior();
              versionStub.normalizeVersion.returns(parse('1.0.0')!);
            });

            it('should load the package manager', async function () {
              const pmMap = await loadPackageManagers(
                [nullPmModule],
                nullExecutor,
                ['nullpm@1'],
              );
              expect(pmMap.get('nullpm@1.0.0'), 'to be a', NullPm);
            });
          });

          describe('when provided a version outside of the accepted range', function () {
            beforeEach(function () {
              versionStub.normalizeVersion.resetBehavior();
              versionStub.normalizeVersion.returns(parse('3.0.0')!);
              sandbox.stub(nullPmModule, 'accepts').returns(false);
            });

            it('should reject', async function () {
              await expect(
                loadPackageManagers([nullPmModule], nullExecutor, ['nullpm@3']),
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
