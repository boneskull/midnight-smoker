import {OK} from 'midnight-smoker/constants';
import {type PkgManagerDef} from 'midnight-smoker/pkg-manager';
import {scheduler} from 'node:timers/promises';
import {TEST_TMPDIR} from './constants';

export const nullPmDef: PkgManagerDef = {
  name: 'null',
  bin: 'nullpm',
  accepts(value: string) {
    return value;
  },
  lockfile: 'nullpm.lock',
  async install() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          stdout: '',
          stderr: '',
          command: 'something',
          exitCode: 0,
          failed: false,
        });
      }, 500);
    });
  },
  async pack() {
    await scheduler.wait(1500);
    return {
      pkgSpec: `${TEST_TMPDIR}/bar.tgz`,
      pkgName: 'bar',
      cwd: TEST_TMPDIR,
      installPath: `${TEST_TMPDIR}/node_modules/bar`,
    };
  },
  async runScript({manifest}) {
    await scheduler.wait(1500);
    return {
      rawResult: {
        stdout: '',
        stderr: '',
        command: '',
        exitCode: 0,
        failed: false,
      },
      skipped: false,
      type: OK,
      manifest,
    };
  },
};
