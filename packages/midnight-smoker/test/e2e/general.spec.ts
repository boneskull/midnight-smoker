import {DEFAULT_PKG_MANAGER_NAME} from '#constants';
import {type ExecError} from '#error/exec-error';
import {type ExecOutput} from '#schema/exec/exec-output';
import {FileManager} from '#util/filemanager';
import {resolveFrom} from '#util/importer';
import fs from 'node:fs/promises';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';

import assertions from '../assertions';
import {execSmoker, fixupOutput} from './cli-helpers';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker [E2E]', function () {
  describe('general behavior', function () {
    describe('when run without arguments on a known-good package', function () {
      const cwd = path.join(
        __dirname,
        'fixture',
        'run-script',
        'single-script',
      );

      it('should not fail', async function () {
        await expect(execSmoker([], {cwd}), 'to be fulfilled');
      });
    });

    describe('package manager defaults', function () {
      this.timeout('10s');

      describe('when no "packageManager" field found in package.json', function () {
        const cwd = path.join(
          __dirname,
          'fixture',
          'run-script',
          'single-script',
        );

        it('should use the default package manager', async function () {
          const {stdout} = await execSmoker(
            ['run', 'smoke', '--json', '--no-lint'],
            {
              cwd,
            },
          );
          const {results} = JSON.parse(fixupOutput(stdout, false));
          expect(results, 'to satisfy', {
            scripts: expect
              .it('to have length', 1)
              .and('not to have an item satisfying', {
                rawResult: expect.it('to contain', DEFAULT_PKG_MANAGER_NAME),
              }),
          });
        });
      });

      describe('when "packageManager" field found in package.json', function () {
        const cwd = path.join(
          __dirname,
          'fixture',
          'general',
          'package-manager-field',
        );
        let pkgManager: string;

        before(async function () {
          const {packageJson} = await FileManager.create().findPkgUp(cwd, {
            strict: true,
          });
          pkgManager = packageJson.packageManager!;
        });

        it('should use the default package manager', async function () {
          const {stdout} = await execSmoker(
            ['run', 'smoke', '--json', '--no-lint'],
            {
              cwd,
            },
          );
          const {results} = JSON.parse(fixupOutput(stdout, false));
          expect(results, 'to satisfy', {
            scripts: expect
              .it('to have length', 1)
              .and('not to have an item satisfying', {
                rawResult: expect.it('to contain', pkgManager),
              }),
          });
        });
      });
    });

    describe('when packing fails', function () {
      describe('when the package.json is missing a version field', function () {
        const cwd = path.join(__dirname, 'fixture', 'general', 'pack-error');
        let output: ExecOutput;

        it('should provide a reason [snapshot]', async function () {
          try {
            await execSmoker([], {
              cwd,
            });
            expect.fail('should have failed');
          } catch (err) {
            snapshot(fixupOutput((err as ExecError).stderr));
          }
          expect(output, 'to be ok');
        });

        describe('when in verbose mode', function () {
          it('should provide more detail [snapshot]', async function () {
            try {
              await execSmoker(['--verbose'], {
                cwd,
              });
              expect.fail('should have failed');
            } catch (err) {
              snapshot(fixupOutput((err as ExecError).stderr));
            }
          });
        });
      });

      describe('when the package.json contains an invalid version', function () {
        const cwd = path.join(
          __dirname,
          'fixture',
          'general',
          'pack-error-bad-version',
        );
        let result: ExecOutput;

        before(async function () {
          try {
            await execSmoker([], {
              cwd,
            });
          } catch (err) {
            result = err as ExecError;
          }
          expect(result, 'to be ok');
        });

        it('should provide a reason [snapshot]', async function () {
          snapshot(fixupOutput(result.stderr));
        });

        describe('when in verbose mode', function () {
          it('should provide more detail [snapshot]', async function () {
            try {
              await execSmoker(['--verbose'], {
                cwd,
              });
              expect.fail('should have failed');
            } catch (err) {
              result = err as ExecError;
            }
            snapshot(fixupOutput(result.stderr));
          });
        });
      });
    });

    describe('installation', function () {
      describe('additional dependencies', function () {
        const cwd = path.join(__dirname, 'fixture', 'general', 'add');
        let lingering: string[];
        let failed: boolean;

        before(async function () {
          const {exitCode, stdout} = await execSmoker(
            [
              'run',
              'smoke',
              '--add=cross-env',
              '--linger',
              '--no-lint',
              '--json',
            ],
            {
              cwd,
            },
          );
          lingering = JSON.parse(stdout).lingering;
          failed = exitCode !== 0;
        });

        it('should not fail', function () {
          expect(failed, 'to be false');
        });

        it('should leave a lingering temp dir', function () {
          expect(lingering, 'to be an array').and('not to be empty');
        });

        it('should add the package to the smoke test', function () {
          expect(() => resolveFrom('cross-env', lingering[0]), 'not to throw');
        });

        after(async function () {
          if (lingering[0]) {
            await fs.rm(lingering[0], {force: true, recursive: true});
          }
        });
      });

      describe('when installation fails', function () {
        const cwd = path.join(__dirname, 'fixture', 'general', 'install-error');
        let result: ExecOutput;

        before(async function () {
          try {
            result = await execSmoker([], {
              cwd,
            });
            expect.fail('should have failed');
          } catch (err) {
            result = err as ExecError;
          }
        });

        it('should provide a reason [snapshot]', async function () {
          snapshot(fixupOutput(result.stderr));
        });

        describe('when in verbose mode', function () {
          before(async function () {
            try {
              await execSmoker(['--verbose'], {
                cwd,
              });
              expect.fail('should have failed');
            } catch (err) {
              result = err as ExecError;
            }
          });

          it('should provide more detail [snapshot]', async function () {
            snapshot(fixupOutput(result.stderr));
          });
        });
      });
    });
  });
});
