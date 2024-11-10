import {type ReporterListener} from '#defs/reporter';
import {assertReporterListenerFn} from '#util/guard/assert/reporter-listener';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('guard', function () {
      describe('assert', function () {
        describe('reporter-listener', function () {
          describe('when value is a valid ReporterListener', function () {
            it('should not throw an error', function () {
              const validReporterListener: ReporterListener = () => {};
              expect(() => {
                assertReporterListenerFn(validReporterListener);
              }, 'not to throw');
            });
          });

          describe('when value is not a valid ReporterListener', function () {
            it('should throw an error', function () {
              const invalidReporterListener = {};
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
