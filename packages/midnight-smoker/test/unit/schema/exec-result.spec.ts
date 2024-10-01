import {AssertionError} from '#error/assertion-error';
import {type ExecOutput, ExecOutputSchema} from '#schema/exec-result';
import {assertExecOutput} from '#util/guard/assert/exec-output';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('schema', function () {
    describe('ExecOutput', function () {
      describe('when provided invalid data', function () {
        it('should throw', function () {
          expect(() => ExecOutputSchema.parse({}), 'to throw');
        });
      });

      describe('when provided valid data', function () {
        it('should not throw', function () {
          expect(() => {
            const output: ExecOutput = {
              command: '',
              cwd: '',
              exitCode: 0,
              stderr: '',
              stdout: '',
            };
            return ExecOutputSchema.parse(output);
          }, 'not to throw');
        });
      });
    });

    describe('assertExecOutput()', function () {
      it('should not throw an error for valid ExecOutput objects', function () {
        const output: ExecOutput = {
          command: 'echo "Hello World"',
          cwd: '/some/path',
          exitCode: 0,
          stderr: '',
          stdout: 'Hello World',
        };
        const validExecResult = ExecOutputSchema.parse(output);
        expect(() => {
          assertExecOutput(validExecResult);
        }, 'not to throw');
      });

      it('should throw an AssertionError for invalid ExecResult objects', function () {
        const invalidExecResult = {}; // Missing required properties
        expect(
          () => {
            assertExecOutput(invalidExecResult);
          },
          'to throw an',
          AssertionError,
        );
      });
    });
  });
});
