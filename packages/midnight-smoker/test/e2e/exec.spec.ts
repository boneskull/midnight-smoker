import {ErrorCode} from '#error/codes';
import {exec} from '#util/exec';
import unexpected from 'unexpected';
import unexpectedSinon from 'unexpected-sinon';

const expect = unexpected.clone().use(unexpectedSinon);

describe('midnight-smoker', function () {
  describe('util', function () {
    describe('exec', function () {
      it('should execute a command without arguments', async function () {
        const command = 'echo';
        const options = {timeout: 1000};

        const result = await exec(command, options);

        expect(result, 'to satisfy', {
          command: 'echo',
          stderr: '',
          stdout: '',
        });
      });

      describe('when the trim option is false', function () {
        it('should not trim output', async function () {
          const command = 'echo';
          const options = {timeout: 1000, trim: false};

          const result = await exec(command, options);

          expect(result, 'to satisfy', {
            command: 'echo',
            stderr: '',
            stdout: expect.it('to match', /\s+/m),
          });
        });
      });

      it('should execute a command with arguments', async function () {
        const command = 'echo';
        const args = ['Hello', 'World'];
        const options = {timeout: 1000};
        const output = {
          command: 'echo Hello World',
          stderr: '',
          stdout: 'Hello World',
        };

        const result = await exec(command, args, options);

        expect(result, 'to satisfy', output);
      });

      it('should reject on spawn errors', async function () {
        const command = 'invalid_command';
        const options = {timeout: 1000};

        await expect(
          exec(command, options),
          'to be rejected with error satisfying',
          {
            code: ErrorCode.SpawnError,
          },
        );
      });

      it('should handle process errors correctly', async function () {
        const command = process.execPath;
        const options = {timeout: 1000};
        const args = ['-e', 'throw new Error("foo")'];
        await expect(
          exec(command, args, options),
          'to be rejected with error satisfying',
          {
            code: ErrorCode.ExecError,
            exitCode: 1,
            stderr: expect.it('to match', /Error: foo/),
            stdout: '',
          },
        );
      });

      it('should include the full command in the result', async function () {
        const command = 'echo';
        const args = ['Hello', 'World'];
        const options = {timeout: 1000};

        const result = await exec(command, args, options);

        expect(result, 'to satisfy', {
          command: 'echo Hello World',
        });
      });
    });
  });
});
