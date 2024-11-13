import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {filterUnsupportedPkgManagersFromEnvelopes} from '#plugin/component-envelope';
import {createSandbox} from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('plugin', function () {
    describe('component-envelope', function () {
      describe('PkgManagerSpec', function () {
        let sandbox: sinon.SinonSandbox;

        beforeEach(function () {
          sandbox = createSandbox();
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('filterUnsupportedPkgManagersFromEnvelopes()', function () {
          let specs: Readonly<PkgManagerSpec>[];
          let desiredPkgManagers: string[];

          beforeEach(function () {
            desiredPkgManagers = ['npm@7', 'yarn@1', 'foo@bar'];
            // @ts-expect-error - urgh, decorators
            PkgManagerSpec.create.cache = new Map();
            specs = [
              PkgManagerSpec.create('npm@7.0.0', {
                requestedAs: 'npm@7',
              }),
              PkgManagerSpec.create('yarn@1.22.10', {
                requestedAs: 'yarn@1',
              }),
              PkgManagerSpec.create('foo@bar', {
                requestedAs: 'foo@bar',
              }),
            ];
          });

          describe('when no desired package managers provided', function () {
            it('should return an empty array', function () {
              expect(
                filterUnsupportedPkgManagersFromEnvelopes(specs),
                'to be empty',
              );
            });
          });

          describe('when all desired package managers provided', function () {
            it('should return an empty array', function () {
              expect(
                filterUnsupportedPkgManagersFromEnvelopes(
                  specs,
                  desiredPkgManagers,
                ),
                'to be empty',
              );
            });
          });

          describe('when not all desired package managers provided', function () {
            it('should return a non-empty array', function () {
              expect(
                filterUnsupportedPkgManagersFromEnvelopes(specs, [
                  ...desiredPkgManagers,
                  'bar@foo',
                ]),
                'to equal',
                ['bar@foo'],
              );
            });
          });

          describe('when no specs provided', function () {
            it('should return the desired package managers', function () {
              expect(
                filterUnsupportedPkgManagersFromEnvelopes(
                  [],
                  desiredPkgManagers,
                ),
                'to equal',
                desiredPkgManagers,
              );
            });
          });
        });
      });
    });
  });
});
