import {ExecaReturnValue} from 'execa';
import fs from 'node:fs/promises';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';
import {readPackageJson} from '../../src/util';
import assertions from '../assertions';
import {execSmoker, fixupOutput} from './helpers';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker', function () {
  describe('smoker CLI', function () {
    let version: string;
    let cwd: string;

    before(async function () {
      const {packageJson, path: packageJsonPath} = await readPackageJson({
        cwd: __dirname,
        strict: true,
      });
      version = packageJson.version!;
      cwd = path.dirname(packageJsonPath);
    });

    describe('script', function () {
      describe('single script', function () {
        const cwd = path.join(__dirname, 'fixture', 'single-script');

        describe('when the script succeeds', function () {
          it('should produce expected output', async function () {
            const {stderr} = await execSmoker(['smoke'], {cwd});
            snapshot(fixupOutput(stderr));
          });
        });

        describe('when the script fails', function () {
          const cwd = path.join(__dirname, 'fixture', 'failure');

          let result: ExecaReturnValue;

          before(async function () {
            try {
              await execSmoker(['smoke'], {
                cwd,
              });
            } catch (e) {
              result = e as ExecaReturnValue;
            }
          });

          it('should produce expected output', async function () {
            snapshot(fixupOutput(result.stderr));
          });

          it('should fail', async function () {
            expect(result, 'to have failed');
          });
        });
      });

      describe('multiple scripts', function () {
        const cwd = path.join(__dirname, 'fixture', 'multi-script');

        describe('when the scripts succeed', function () {
          it('should produce expected output', async function () {
            const {stderr} = await execSmoker(['smoke:a', 'smoke:b'], {cwd});
            snapshot(fixupOutput(stderr));
          });
        });
      });
    });

    describe('option', function () {
      describe('--version', function () {
        it('should print version and exit', async function () {
          expect(await execSmoker(['--version'], {cwd}), 'to output', version);
        });
      });

      describe('--help', function () {
        it('should show help text', async function () {
          const {stderr} = await execSmoker(['--help'], {
            cwd,
          });
          snapshot(fixupOutput(stderr));
        });
      });

      describe('--json', function () {
        describe('when the script succeeds', function () {
          const cwd = path.join(__dirname, 'fixture', 'single-script');

          let result: ExecaReturnValue;

          before(async function () {
            result = await execSmoker(['smoke', '--json'], {cwd});
          });

          it('should produce JSON output', function () {
            expect(result, 'to output valid JSON');
          });

          it('should produce expected output', async function () {
            snapshot(fixupOutput(result.stdout));
          });
        });

        describe('when the script fails', function () {
          const cwd = path.join(__dirname, 'fixture', 'failure');

          let result: ExecaReturnValue;

          before(async function () {
            try {
              await execSmoker(['smoke', '--json'], {cwd});
            } catch (e) {
              result = e as ExecaReturnValue;
            }
          });

          it('should fail', function () {
            expect(result, 'to have failed');
          });

          it('should produce JSON output', async function () {
            expect(result, 'to output valid JSON');
          });

          it('should provide helpful result', async function () {
            snapshot(fixupOutput(result.stdout));
          });
        });
      });

      describe('--add', function () {
        const cwd = path.join(__dirname, 'fixture', 'add');
        let lingeringTempDir: string;

        it('should add a package to the smoke test', async function () {
          const {stderr, failed} = await execSmoker(
            ['smoke', '--add=cross-env', '--linger'],
            {
              cwd,
            },
          );
          const lines = stderr.trim().split(/\r?\n/);
          lingeringTempDir = lines[lines.length - 1].trim();

          expect(failed, 'to be false');
          // this is probably brittle. could use something like `resolve-from`
          // or even invoke `npm ls` or `npm exec` to check for its existence
          await expect(
            fs.stat(path.join(lingeringTempDir, 'node_modules', 'cross-env')),
            'to be fulfilled',
          );
        });

        after(async function () {
          if (lingeringTempDir) {
            await fs.rm(lingeringTempDir, {recursive: true, force: true});
          }
        });
      });
    });
  });
});
