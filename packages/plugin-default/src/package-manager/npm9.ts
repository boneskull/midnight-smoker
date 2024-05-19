import {type ExecResult} from 'midnight-smoker/executor';
import {
  normalizeVersion,
  type PkgManagerAcceptsResult,
  type PkgManagerDef,
  type PkgManagerInstallContext,
} from 'midnight-smoker/pkg-manager';
import {Range} from 'semver';
import {npmVersionData} from './data';
import {install} from './npm';
import Npm7 from './npm7';

const Npm9 = {
  ...Npm7,
  supportedVersionRange: new Range('>=9.0.0'),

  accepts(value: string): PkgManagerAcceptsResult {
    const version = normalizeVersion(npmVersionData, value);
    if (version && Npm9.supportedVersionRange.test(version)) {
      return version;
    }
  },
  async install(ctx: PkgManagerInstallContext): Promise<ExecResult> {
    return install(ctx, [
      '--no-audit',
      '--no-package-lock',
      '--install-strategy=shallow',
      '--json',
    ]);
  },
} as const satisfies PkgManagerDef;

export default Npm9;
