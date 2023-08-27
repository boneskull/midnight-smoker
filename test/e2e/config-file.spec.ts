import path from 'node:path';
import unexpected from 'unexpected';
import assertions from '../assertions';
import {execSmoker} from './helpers';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker', function () {
  describe('config file support', function () {
    describe('when config file is ESM', async function () {
      const cwd = path.join(__dirname, 'fixture', 'config-esm');

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

    describe('when config is within package.json', async function () {
      const cwd = path.join(__dirname, 'fixture', 'config-package-json');

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

    describe('when an config file contains a "script" prop', async function () {
      const cwd = path.join(__dirname, 'fixture', 'config-script');

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

    describe('when an config file contains a "scripts" prop', async function () {
      const cwd = path.join(__dirname, 'fixture', 'config-scripts');

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
