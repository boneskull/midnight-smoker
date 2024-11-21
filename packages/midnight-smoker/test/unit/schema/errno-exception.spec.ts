import {ErrnoExceptionSchema} from '#schema/util/errno-exception';
import {isErrnoException} from '#util/guard/errno-exception';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('schema', function () {
    describe('ErrnoException', function () {
      describe('ErrnoExceptionSchema', function () {
        describe('when parsing a plain error', function () {
          it('should throw', function () {
            expect(() => {
              ErrnoExceptionSchema.parse(new Error('Test error'));
            }, 'to throw');
          });
        });

        describe('when parsing an ErrnoException', function () {
          it('should not throw', function () {
            expect(() => {
              ErrnoExceptionSchema.parse(
                Object.assign(new Error('Test error'), {
                  code: 'ENOENT',
                }),
              );
            }, 'not to throw');
          });

          it('should return an instance of Error', function () {
            const error = ErrnoExceptionSchema.parse(
              Object.assign(new Error('Test error'), {
                code: 'ENOENT',
              }),
            );
            expect(error, 'to be an', Error);
          });
        });
      });

      describe('isErrnoException()', function () {
        it('should return true if value is an ErrnoException', function () {
          const error = Object.assign(new Error('Test error'), {
            code: 'ENOENT',
          });
          expect(
            error,
            'when passed as parameter to',
            isErrnoException,
            'to be true',
          );
        });

        it('should return false if value is not an ErrnoException', function () {
          const error = new Error('Test error');
          expect(
            error,
            'when passed as parameter to',
            isErrnoException,
            'to be false',
          );
        });
      });
    });
  });
});
