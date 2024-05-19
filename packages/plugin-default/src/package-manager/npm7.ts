import {type ExecResult} from 'midnight-smoker/executor';
import {
  normalizeVersion,
  type PkgManagerAcceptsResult,
  type PkgManagerDef,
  type PkgManagerInstallContext,
} from 'midnight-smoker/pkg-manager';
import {Range} from 'semver';
import {npmVersionData} from './data';
import {BaseNpmPackageManager, install} from './npm';

const Npm7 = {
  ...BaseNpmPackageManager,

  supportedVersionRange: new Range('^7.0.0 || ^8.0.0'),

  accepts(value: string): PkgManagerAcceptsResult {
    const version = normalizeVersion(npmVersionData, value);
    if (version && Npm7.supportedVersionRange.test(version)) {
      return version;
    }
  },

  async install(ctx: PkgManagerInstallContext): Promise<ExecResult> {
    return install(ctx, [
      '--no-audit',
      '--no-package-lock',
      '--global-style',
      '--json',
    ]);
  },
} as const satisfies PkgManagerDef;

export default Npm7;
