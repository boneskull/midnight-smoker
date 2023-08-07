import fs from 'node:fs/promises';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';
import {readPackageJson} from '../../src/util';
import assertions from '../assertions';
import {dump, execSmoker} from './helpers';
import {ExecaReturnValue} from 'execa';

const expect = unexpected.clone().use(assertions);

function fixup(stdout: string) {
  return (
    stdout
      // strip the paths to npm/node in command
      .replace(/(?:\S+?)(\/bin\/(node|npm)(?:\.exe|\.cmd)?)/g, '<path/to/>$1')
      // strip the versions since it will change
      .replace(/midnight-smoker@\d+\.\d+\.\d+/, 'midnight-smoker@<version>')
      .replace(/--version\\n\\n\d+\.\d+\.\d+/, '--version\\n\\n<version>')
      // strip the path to `cli.js` since it differs per platform
      .replace(/node(\.exe)?\s+\S+?smoker\.js/, '<path/to/>smoker.js')
      .replace(/"cwd":\s+"[^"]+"/, '"cwd": "<cwd>"')
  );
}

describe('midnight-smoker CLI', function () {
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

  describe('flag', function () {
    describe('--version', function () {
      it('should print version and exit', async function () {
        expect(await execSmoker(['--version'], {cwd}), 'to output', version);
      });
    });

    describe('--help', function () {
      it('should show help text', async function () {
        const {stdout, stderr, exitCode} = await execSmoker(['--help'], {cwd});
        snapshot({stdout, stderr, exitCode});
      });
    });

    describe('when the test passes', function () {
      it('should produce expected output', async function () {
        const {stderr} = await execSmoker(['smoke:js'], {cwd});
        snapshot(stderr);
      });
    });

    describe('when the test fails', function () {
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
        snapshot(fixup(result.stderr));
      });

      it('should fail', async function () {
        expect(result, 'to have failed');
      });
    });

    describe('--json', function () {
      describe('when the test passes', function () {
        let result: ExecaReturnValue;

        before(async function () {
          result = await execSmoker(['smoke:js', '--json'], {cwd});
        });

        it('should produce JSON output', function () {
          expect(result, 'to output valid JSON');
        });

        it('should produce expected output', async function () {
          snapshot(fixup(result.stdout));
        });
      });

      describe('when the test fails', function () {
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
          snapshot(fixup(result.stdout));
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
