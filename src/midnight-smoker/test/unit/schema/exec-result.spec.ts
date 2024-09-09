import {AssertionError} from '#error/assertion-error';
import {assertExecResult, ExecResultSchema} from '#schema/exec-result';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('schema', function () {
    describe('ExecResult', function () {
      describe('assertExecResult()', function () {
        it('should not throw an error for valid ExecResult objects', function () {
          const validExecResult = ExecResultSchema.parse({
            command: 'echo "Hello World"',
            escapedCommand: 'echo \\"Hello World\\"',
            exitCode: 0,
            failed: false,
            isCanceled: false,
            killed: false,
            stderr: '',
            stdout: 'Hello World',
            timedOut: false,
          });
          expect(() => {
            assertExecResult(validExecResult);
          }, 'not to throw');
        });

        it('should throw an AssertionError for invalid ExecResult objects', function () {
          const invalidExecResult = {}; // Missing required properties
          expect(
            () => {
              assertExecResult(invalidExecResult);
            },
            'to throw an',
            AssertionError,
          );
        });
      });
    });
  });
});
