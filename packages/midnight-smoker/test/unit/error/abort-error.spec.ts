import {AbortError} from '#error/abort-error';
import sinon from 'sinon';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('error', function () {
    describe('abort-error', function () {
      let sandbox: sinon.SinonSandbox;

      beforeEach(function () {
        sandbox = sinon.createSandbox();
      });

      afterEach(function () {
        sandbox.restore();
      });

      describe('when constructed with an Error', function () {
        it('should set the message and error properties correctly', function () {
          const error = new Error('Test error');
          const abortError = new AbortError(error);

          expect(abortError, 'to satisfy', {
            cause: error,
            message: 'Test error',
          });
        });
      });

      describe('when constructed with a message and an Error', function () {
        it('should set the message and error properties correctly', function () {
          const error = new Error('Test error');
          const abortError = new AbortError('Custom message', error);

          expect(abortError, 'to satisfy', {
            cause: error,
            message: 'Custom message',
          });
        });
      });

      describe('when constructed with a message and an id', function () {
        it('should set the message and id properties correctly', function () {
          const abortError = new AbortError('Custom message', '1234');

          expect(abortError, 'to satisfy', {
            context: {id: '1234'},
            message: 'Custom message',
          });
        });
      });

      describe('when constructed with a reason that is not an Error or string', function () {
        it('should set the message and reason properties correctly', function () {
          const reason = {some: 'reason'};
          const abortError = new AbortError(reason);

          expect(abortError, 'to satisfy', {
            context: {
              reason,
            },
            message: "Aborted via signal; reason: { some: 'reason' }",
          });
        });
      });

      describe('when constructed with no arguments', function () {
        it('should set the message to "Aborted via signal"', function () {
          const abortError = new AbortError();

          expect(abortError.message, 'to equal', 'Aborted via signal');
        });
      });
    });
  });
});
