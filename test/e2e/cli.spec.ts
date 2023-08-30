import fs from 'node:fs/promises';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';
import type {RawRunScriptResult} from '../../src/types';
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

    describe('when run without arguments', function () {
      const cwd = path.join(__dirname, 'fixture', 'single-script');

      it('should not fail', async function () {
        await expect(execSmoker([], {cwd}), 'to be fulfilled');
      });
    });

    describe('script', function () {
      describe('single script', function () {
        const cwd = path.join(__dirname, 'fixture', 'single-script');

        describe('when the script succeeds', function () {
          it('should produce expected output [snapshot]', async function () {
            const {stderr} = await execSmoker(['smoke', '--no-checks'], {cwd});
            snapshot(fixupOutput(stderr));
          });
        });

        describe('when the script fails', function () {
          const cwd = path.join(__dirname, 'fixture', 'failure');

          let result: RawRunScriptResult;

          before(async function () {
            try {
              result = await execSmoker(['smoke', '--no-checks'], {
                cwd,
              });
            } catch (e) {
              result = e as RawRunScriptResult;
            }
          });

          it('should produce expected output [snapshot]', async function () {
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
          it('should produce expected output [snapshot]', async function () {
            const {stderr} = await execSmoker(
              ['smoke:a', 'smoke:b', '--no-checks'],
              {cwd},
            );
            snapshot(fixupOutput(stderr));
          });
        });
      });
    });

    describe('check', function () {
      describe('when a check fails', function () {
        describe('when the rule severity is "error"', function () {
          const cwd = path.join(__dirname, 'fixture', 'check-error');
          let result: RawRunScriptResult;

          before(async function () {
            try {
              result = await execSmoker([], {
                cwd,
              });
            } catch (e) {
              result = e as RawRunScriptResult;
            }
          });

          it('should exit with a non-zero exit code', function () {
            expect(result.exitCode, 'to be greater than', 0);
          });

          it('should produce expected output [snapshot]', async function () {
            snapshot(fixupOutput(result.stderr));
          });
        });

        describe('when the rule severity is "warn"', function () {
          const cwd = path.join(__dirname, 'fixture', 'check-warn');
          let result: RawRunScriptResult;

          before(async function () {
            result = await execSmoker([], {
              cwd,
            });
          });

          it('should not exit with a non-zero exit code', function () {
            expect(result.exitCode, 'to be', 0);
          });

          it('should produce expected output [snapshot]', async function () {
            snapshot(fixupOutput(result.stderr));
          });
        });

        describe('when the rule severity is "off"', function () {
          const cwd = path.join(__dirname, 'fixture', 'check-off');
          let result: RawRunScriptResult;

          before(async function () {
            result = await execSmoker([], {
              cwd,
            });
          });

          it('should not exit with a non-zero exit code', function () {
            expect(result.exitCode, 'to be', 0);
          });

          it('should produce expected output [snapshot]', async function () {
            snapshot(fixupOutput(result.stderr));
          });
        });
      });
    });

    describe('when packing fails', function () {
      const cwd = path.join(__dirname, 'fixture', 'pack-error');
      let result: RawRunScriptResult;

      before(async function () {
        try {
          await execSmoker([], {
            cwd,
          });
          expect.fail('should have failed');
        } catch (err) {
          result = err as RawRunScriptResult;
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
            result = err as RawRunScriptResult;
          }
        });

        it('should provide more detail [snapshot]', async function () {
          snapshot(fixupOutput(result.stderr));
        });
      });
    });

    describe('when installation fails', function () {
      const cwd = path.join(__dirname, 'fixture', 'install-error');
      let result: RawRunScriptResult;

      before(async function () {
        try {
          result = await execSmoker([], {
            cwd,
          });
        } catch (err) {
          result = err as RawRunScriptResult;
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
            result = err as RawRunScriptResult;
          }
        });

        it('should provide more detail [snapshot]', async function () {
          snapshot(fixupOutput(result.stderr));
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
        it('should show help text [snapshot]', async function () {
          const {stdout} = await execSmoker(['--help'], {
            cwd,
          });
          snapshot(fixupOutput(stdout));
        });
      });

      describe('--json', function () {
        describe('when run without other arguments', function () {
          const cwd = path.join(__dirname, 'fixture', 'single-script');

          it('should produce statistics for checks only', async function () {
            const result = await execSmoker(['--json'], {cwd});
            const {stats} = JSON.parse(fixupOutput(result.stdout, false));
            expect(stats, 'to satisfy', {
              totalPackages: 1,
              totalPackageManagers: 1,
              totalScripts: null,
              failedScripts: null,
              passedScripts: null,
              totalChecks: expect.it('to be greater than', 0),
              failedChecks: 0,
              passedChecks: expect.it('to be greater than', 0),
            });
          });
        });

        describe('when the script succeeds', function () {
          const cwd = path.join(__dirname, 'fixture', 'single-script');

          let result: RawRunScriptResult;

          before(async function () {
            result = await execSmoker(['smoke', '--json'], {
              cwd,
            });
          });

          it('should produce JSON output', function () {
            expect(result, 'to output valid JSON');
          });

          it('should produce expected script output [snapshot]', async function () {
            const {results} = JSON.parse(fixupOutput(result.stdout, false));
            snapshot(results);
          });

          it('should produce statistics', async function () {
            const {stats} = JSON.parse(result.stdout);
            expect(stats, 'to satisfy', {
              totalPackages: 1,
              totalPackageManagers: 1,
              totalScripts: 1,
              failedScripts: 0,
              passedScripts: 1,
              totalChecks: expect.it('to be greater than', 0),
              failedChecks: 0,
              passedChecks: expect.it('to be greater than', 0),
            });
          });
        });

        describe('when the script fails', function () {
          const cwd = path.join(__dirname, 'fixture', 'failure');

          let result: RawRunScriptResult;

          before(async function () {
            try {
              await execSmoker(['smoke', '--json', '--no-checks'], {cwd});
            } catch (err) {
              result = err as RawRunScriptResult;
            }
          });

          it('should fail', function () {
            expect(result, 'to have failed');
          });

          it('should produce JSON output', async function () {
            expect(result, 'to output valid JSON');
          });

          it('should provide helpful result [snapshot]', async function () {
            snapshot(fixupOutput(result.stdout));
          });
        });
      });

      describe('--add', function () {
        const cwd = path.join(__dirname, 'fixture', 'add');
        let lingeringTempDir: string;

        it('should add a package to the smoke test', async function () {
          const {stderr, failed} = await execSmoker(
            ['smoke', '--add=cross-env', '--linger', '--no-checks'],
            {
              cwd,
            },
          );
          const lines = stderr.trim().split(/\r?\n/);
          // leading "» "
          lingeringTempDir = lines[lines.length - 1].trim().slice(2);

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
