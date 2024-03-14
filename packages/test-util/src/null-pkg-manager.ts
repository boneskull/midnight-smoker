import {type PkgManagerDef} from 'midnight-smoker/pkg-manager';
import {TEST_TMPDIR} from './constants';

export const nullPmDef: PkgManagerDef = {
  bin: 'nullpm',
  accepts(value: string) {
    return value;
  },
  lockfile: 'nullpm.lock',
  async install() {
    return {
      stdout: '',
      stderr: '',
      command: 'something',
      exitCode: 0,
      failed: false,
    };
  },
  async pack() {
    return [
      {
        pkgSpec: `${TEST_TMPDIR}/bar.tgz`,
        pkgName: 'bar',
        cwd: TEST_TMPDIR,
      },
    ];
  },
  async runScript() {
    return {
      rawResult: {
        stdout: '',
        stderr: '',
        command: '',
        exitCode: 0,
        failed: false,
      },
      skipped: false,
    };
  },
};
