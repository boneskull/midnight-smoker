import {UnknownError} from '#error/unknown-error';
import {ValidationError} from '#error/validation-error';
import {fromUnknownError} from '#util/from-unknown-error';
import unexpected from 'unexpected';
import {ZodError} from 'zod';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('from-unknown-error', function () {
      describe('fromUnknownError', function () {
        describe('when error is a SomeSmokerError', function () {
          it('should return the error as is', function () {
            const someSmokerError = new ValidationError('Test error');
            const result = fromUnknownError(someSmokerError);
            expect(result, 'to be', someSmokerError);
          });
        });

        describe('when error is a ZodError', function () {
          it('should convert the error to a ValidationError', function () {
            const zodError = new ZodError([]);
            const result = fromUnknownError(zodError);
            expect(result, 'to be a', ValidationError);
          });
        });

        describe('when error is a ZodValidationError', function () {
          it('should convert the error to a ValidationError', function () {
            const zodValidationError = new ValidationError('Test error');
            const result = fromUnknownError(zodValidationError);
            expect(result, 'to be a', ValidationError);
          });
        });

        describe('when error is unknown and wrap is true', function () {
          it('should wrap the error in an UnknownError', function () {
            const unknownError = {message: 'Unknown error'};
            const result = fromUnknownError(unknownError, true);
            expect(result, 'to be a', UnknownError);
          });
        });

        describe('when error is unknown and wrap is false', function () {
          it('should convert the error to an UnknownError', function () {
            const unknownError = {message: 'Unknown error'};
            const result = fromUnknownError(unknownError, false);
            expect(result, 'to be a', UnknownError);
          });
        });

        describe('when error is an instance of Error', function () {
          it('should return the error as is', function () {
            const error = new Error('Test error');
            const result = fromUnknownError(error);
            expect(result, 'to be', error);
          });
        });

        describe('when error is not an instance of Error', function () {
          it('should convert the error to an UnknownError', function () {
            const unknownError = 'Unknown error';
            const result = fromUnknownError(unknownError);
            expect(result, 'to be a', UnknownError);
          });
        });
      });
    });
  });
});
