import {type ReporterListener} from '#defs/reporter';
import {assertReporterListenerFn} from '#util/guard/assert/reporter-listener';
import * as guard from '#util/guard/reporter-listener';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('guard', function () {
      describe('assert', function () {
        describe('reporter-listener', function () {
          let sandbox: sinon.SinonSandbox;

          beforeEach(function () {
            sandbox = sinon.createSandbox();
          });

          afterEach(function () {
            sandbox.restore();
          });

          describe('when value is a valid ReporterListener', function () {
            it('should not throw an error', function () {
              const validReporterListener: ReporterListener = () => {};
              sandbox.stub(guard, 'isReporterListenerFn').returns(true);

              expect(() => {
                assertReporterListenerFn(validReporterListener);
              }, 'not to throw');
            });
          });

          describe('when value is not a valid ReporterListener', function () {
            it('should throw an error', function () {
              const invalidReporterListener = {};
              sandbox.stub(guard, 'isReporterListenerFn').returns(false);

              expect(
                () => {
                  assertReporterListenerFn(invalidReporterListener);
                },
                'to throw',
                'Expected a ReporterListener',
              );
            });
          });
        });
      });
    });
  });
});
