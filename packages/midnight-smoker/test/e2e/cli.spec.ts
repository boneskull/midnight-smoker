import {type ExecError} from '#error/exec-error';
import {FileManager} from '#util/filemanager';
import path from 'node:path';
import snapshot from 'snap-shot-it';
import unexpected from 'unexpected';

import assertions from '../assertions';
import {execSmoker, fixupOutput} from './cli-helpers';

const expect = unexpected.clone().use(assertions);

describe('midnight-smoker [E2E]', function () {
  describe('command-line interface', function () {
    let version: string;
    let cwd: string;

    before(async function () {
      const {packageJson, path: packageJsonPath} =
        await FileManager.create().findPkgUp(__dirname, {strict: true});
      version = packageJson.version!;
      cwd = path.dirname(packageJsonPath);
    });

    describe('invalid usage', function () {
      describe('when invalid option is provided', function () {
        it('should show help [snapshot]', async function () {
          try {
            await execSmoker(['--hlep']);
            expect.fail();
          } catch (err) {
            snapshot(fixupOutput((err as ExecError).stderr));
          }
        });
      });

      describe('when invalid command is provided', function () {
        it('should show help [snapshot]', async function () {
          try {
            await execSmoker(['butts']);
            expect.fail();
          } catch (err) {
            snapshot(fixupOutput((err as ExecError).stderr));
          }
        });
      });

      describe('when positional is missing', function () {
        it('should show help [snapshot]', async function () {
          try {
            await execSmoker(['run-script']);
            expect.fail();
          } catch (err) {
            snapshot(fixupOutput((err as ExecError).stderr));
          }
        });
      });
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
