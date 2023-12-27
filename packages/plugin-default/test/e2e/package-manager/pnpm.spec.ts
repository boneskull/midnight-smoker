import {execSmoker} from '@midnight-smoker/test-util';
import path from 'node:path';
import unexpected from 'unexpected';

export const expect = unexpected.clone();

describe('@midnight-smoker/plugin-default', function () {
  describe('package manager behavior', function () {
    describe('pnpm', function () {
      it('should fail (for now)', async function () {
        const cwd = path.join(__dirname, 'fixture', 'single-script');
        await expect(
          execSmoker(['run', `--pm=pnpm`, '--json', '--no-lint'], {
            cwd,
          }),
          'to be rejected with error satisfying',
          /pnpm is currently unsupported/,
        );
      });
    });
  });
});
