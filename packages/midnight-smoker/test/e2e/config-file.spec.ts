import {execSmoker} from '@midnight-smoker/test-util';
import path from 'node:path';
import unexpected from 'unexpected';
import assertions from '../assertions';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker [E2E]', function () {
  describe('config file support', function () {
    describe('when config file is ESM', function () {
      const cwd = path.join(__dirname, 'fixture', 'config-file', 'config-esm');

      it('should respect the config file', async function () {
        const {stdout} = await execSmoker(['smoke', '--no-checks'], {
          cwd,
        });
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect
              .it('to have length', 2)
              .and('to satisfy', [
                {rawResult: {command: /npm/}},
                {rawResult: {command: /yarn/}},
              ]),
          },
        });
      });
    });

    describe('when config is within package.json', function () {
      const cwd = path.join(
        __dirname,
        'fixture',
        'config-file',
        'config-package-json',
      );

      it('should respect the config file', async function () {
        const {stdout} = await execSmoker(['smoke'], {
          cwd,
        });
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect
              .it('to have length', 2)
              .and('to satisfy', [
                {rawResult: {command: /npm/}},
                {rawResult: {command: /yarn/}},
              ]),
          },
        });
      });
    });

    describe('when an config file contains a "script" prop', function () {
      const cwd = path.join(
        __dirname,
        'fixture',
        'config-file',
        'config-script',
      );

      it('should run script from config file', async function () {
        // includes json: true
        const {stdout} = await execSmoker(['--no-checks'], {cwd});
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect.it('to have length', 1),
          },
        });
      });

      describe('when the CLI also contains a script', function () {
        it('should run all scripts', async function () {
          const {stdout} = await execSmoker(['smoke', '--no-checks'], {cwd});
          const result = JSON.parse(stdout);
          expect(result, 'to satisfy', {
            results: {
              scripts: expect.it('to have length', 2),
            },
          });
        });
      });
    });

    describe('when an config file contains a "scripts" prop', function () {
      const cwd = path.join(
        __dirname,
        'fixture',
        'config-file',
        'config-scripts',
      );

      it('should run scripts from config file', async function () {
        const {stdout} = await execSmoker(['--no-checks'], {cwd});
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect.it('to have length', 1),
          },
        });
      });

      describe('when the CLI also contains a script', function () {
        it('should run all scripts', async function () {
          const {stdout} = await execSmoker(['smoke', '--no-checks'], {cwd});
          const result = JSON.parse(stdout);
          expect(result, 'to satisfy', {
            results: {
              scripts: expect.it('to have length', 2),
            },
          });
        });
      });
    });
  });
});
