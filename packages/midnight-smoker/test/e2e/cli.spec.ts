import {execSmoker, fixupOutput} from '@midnight-smoker/test-util';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';
import {readPackageJson} from '../../src/pkg-util';
import assertions from '../assertions';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker [E2E]', function () {
  describe('command-line interface', function () {
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

    describe('command', function () {
      describe('list', function () {
        describe('reporters', function () {
          it('should list reporters [snapshot]', async function () {
            const {stdout} = await execSmoker(['list', 'reporters'], {
              cwd,
            });
            snapshot(fixupOutput(stdout));
          });
        });
        describe('rules', function () {
          it('should list rules [snapshot]', async function () {
            const {stdout} = await execSmoker(['list', 'rules'], {
              cwd,
            });
            snapshot(fixupOutput(stdout));
          });
        });

        describe('pkg-managers', function () {
          it('should list package managers [snapshot]', async function () {
            const {stdout} = await execSmoker(['list', 'pkg-managers'], {
              cwd,
            });
            snapshot(fixupOutput(stdout));
          });
        });

        describe('plugins', function () {
          it('should list plugins [snapshot]', async function () {
            const {stdout} = await execSmoker(['list', 'plugins'], {
              cwd,
            });
            snapshot(fixupOutput(stdout));
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
        it('should show help text [snapshot]', async function () {
          const {stdout} = await execSmoker(['--help'], {
            cwd,
          });
          snapshot(fixupOutput(stdout));
        });
      });
    });
  });
});
