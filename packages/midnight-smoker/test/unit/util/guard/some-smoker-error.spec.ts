import {UnknownError} from '#error/unknown-error';
import {ValidationError} from '#error/validation-error';
import {isSomeSmokerError} from '#util/guard/some-smoker-error';
import sinon from 'sinon';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';
const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('guard', function () {
      describe('isSomeSmokerError', function () {
        let sandbox: sinon.SinonSandbox;

        beforeEach(function () {
          sandbox = sinon.createSandbox();
        });

        afterEach(function () {
          sandbox.restore();
        });

        describe('when error is a valid SomeSmokerError', function () {
          it('should return true', function () {
            const error = new UnknownError('This is a test error');

            expect(isSomeSmokerError(error), 'to be true');
          });
        });

        describe('when error is a ValidationError', function () {
          it('should return true', function () {
            const error = new ValidationError('This is a test error');

            expect(isSomeSmokerError(error), 'to be true');
          });
        });

        describe('when error is not a valid SomeSmokerError', function () {
          describe('when error is undefined', function () {
            it('should return false', function () {
              expect(isSomeSmokerError(new Error('stuff')), 'to be false');
            });
          });

          describe('when error is not an instance of Error', function () {
            it('should return false', function () {
              const error = {...new UnknownError('This is a test error')};

              expect(isSomeSmokerError(error), 'to be false');
            });
          });

          describe('when error does not have a code property', function () {
            it('should return false', function () {
              const error = new UnknownError('This is a test error');
              // @ts-expect-error needed type
              delete error.code;

              expect(isSomeSmokerError(error), 'to be false');
            });
          });

          describe('when error does not have a name property', function () {
            it('should return false', function () {
              const error = new UnknownError('This is a test error');
              // @ts-expect-error needed type
              delete error.name;

              expect(isSomeSmokerError(error), 'to be false');
            });
          });

          describe('when error code does not match ErrorCode', function () {
            it('should return false', function () {
              const error = new UnknownError('This is a test error');
              // @ts-expect-error bad type
              error.code = 'foo';

              expect(isSomeSmokerError(error), 'to be false');
            });
          });
        });
      });
    });
  });
});
