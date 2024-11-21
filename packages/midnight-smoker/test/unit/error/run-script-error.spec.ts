import {type ExecOutput} from '#defs/executor';
import {ExecError} from '#error/exec-error';
import {RunScriptError} from '#error/run-script-error';
import {stripAnsi} from '#util/format';
import unexpected from 'unexpected';

const expect = unexpected.clone();

describe('midnight-smoker', function () {
  describe('error', function () {
    describe('run-script-error', function () {
      describe('RunScriptError', function () {
        describe('method', function () {
          describe('formatMessage', function () {
            describe('when verbose is false', function () {
              it('should format the message including the error code', function () {
                const output: ExecOutput = {
                  stderr: 'stderr output',
                  stdout: 'stdout output',
                };
                const execError = new ExecError('Command failed', output);
                const runScriptError = new RunScriptError(
                  execError,
                  'test',
                  'example-package',
                  'npm',
                );

                const formattedMessage = stripAnsi(
                  runScriptError.formatMessage(false),
                );

                expect(
                  formattedMessage,
                  'to equal',
                  stripAnsi(
                    `${runScriptError.message} ${runScriptError.formatCode(
                      false,
                    )}`,
                  ),
                );
              });
            });

            describe('when verbose is true', function () {
              it('should format the message correctly', function () {
                const output: ExecOutput = {
                  command: 'some command',
                  stderr: 'stderr output',
                  stdout: 'stdout output',
                };
                const execError = new ExecError('Command failed', output);
                const runScriptError = new RunScriptError(
                  execError,
                  'test',
                  'example-package',
                  'npm',
                );

                const formattedMessage = stripAnsi(
                  runScriptError.formatMessage(true),
                );

                expect(formattedMessage, 'to contain', 'Message:')
                  .and('to contain', stripAnsi(runScriptError.message))
                  .and('to contain', 'Command:')
                  .and('to contain', stripAnsi(runScriptError.context.command!))
                  .and('to contain', 'Output:')
                  .and('to contain', stripAnsi(runScriptError.context.output));
              });
            });
          });
        });
      });
    });
  });
});
