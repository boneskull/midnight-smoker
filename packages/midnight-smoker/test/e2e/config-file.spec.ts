import path from 'node:path';
import unexpected from 'unexpected';

import assertions from '../assertions';
import {execSmoker} from './cli-helpers';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker [E2E]', function () {
  describe('config file support', function () {
    describe('when user provides explicit path to config file', function () {
      const cwd = path.join(
        __dirname,
        'fixture',
        'config-file',
        'config-json-custom',
      );

      it('should load the specific config file', async function () {
        const {stdout} = await execSmoker(
          ['run', 'smoke', '--no-lint', '--config', './my-smoker-config.json'],
          {
            cwd,
          },
        );
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect
              .it('to have length', 2)
              .and('to have an item satisfying', {rawResult: {command: /npm/}})
              .and('to have an item satisfying', {
                rawResult: {command: /yarn/},
              }),
          },
        });
      });
    });

    describe('when config file is ESM', function () {
      const cwd = path.join(__dirname, 'fixture', 'config-file', 'config-esm');

      it('should load the config file', async function () {
        const {stdout} = await execSmoker(['run', 'smoke', '--no-lint'], {
          cwd,
        });
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect
              .it('to have length', 2)
              .and('to have an item satisfying', {rawResult: {command: /npm/}})
              .and('to have an item satisfying', {
                rawResult: {command: /yarn/},
              }),
          },
        });
      });
    });

    describe('when config file is TS', function () {
      const cwd = path.join(__dirname, 'fixture', 'config-file', 'config-ts');

      it('should load the config file', async function () {
        const {stdout} = await execSmoker(['run', 'smoke', '--no-lint'], {
          cwd,
        });
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect
              .it('to have length', 2)
              .and('to have an item satisfying', {rawResult: {command: /npm/}})
              .and('to have an item satisfying', {
                rawResult: {command: /yarn/},
              }),
          },
        });
      });
    });

    describe('when config file is CJS', function () {
      const cwd = path.join(__dirname, 'fixture', 'config-file', 'config-cjs');

      it('should load the config file', async function () {
        const {stdout} = await execSmoker(['run', 'smoke', '--no-lint'], {
          cwd,
        });
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect
              .it('to have length', 2)
              .and('to have an item satisfying', {rawResult: {command: /npm/}})
              .and('to have an item satisfying', {
                rawResult: {command: /yarn/},
              }),
          },
        });
      });
    });

    describe('when config file is JSON', function () {
      const cwd = path.join(__dirname, 'fixture', 'config-file', 'config-json');

      it('should load the config file', async function () {
        const {stdout} = await execSmoker(['run', 'smoke', '--no-lint'], {
          cwd,
        });
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect
              .it('to have length', 2)
              .and('to have an item satisfying', {rawResult: {command: /npm/}})
              .and('to have an item satisfying', {
                rawResult: {command: /yarn/},
              }),
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

      it('should load the config file', async function () {
        const {stdout} = await execSmoker(['run', 'smoke'], {
          cwd,
        });
        const result = JSON.parse(stdout);
        expect(result, 'to satisfy', {
          results: {
            scripts: expect
              .it('to have length', 2)
              .and('to have an item satisfying', {rawResult: {command: /npm/}})
              .and('to have an item satisfying', {
                rawResult: {command: /yarn/},
              }),
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

      it('should still fail if no script argument is provided', async function () {
        // includes json: true
        await expect(
          execSmoker(['run', '--no-lint'], {cwd}),
          'to be rejected with error satisfying',
          {stderr: /not enough non-option arguments/i},
        );
      });

      describe('when the CLI also contains a script', function () {
        // XXX TODO something in pkg manager machine fails to emit a RunScriptOk
        it('should run all scripts', async function () {
          const {stdout} = await execSmoker(['run', 'smoke', '--no-lint'], {
            cwd,
          });
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
