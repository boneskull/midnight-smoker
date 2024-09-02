import {type ExecResult} from 'midnight-smoker/executor';
import {
  type PkgManager,
  type PkgManagerInstallContext,
} from 'midnight-smoker/pkg-manager';
import {Range} from 'semver';

import {npmVersionData} from './data';
import {BaseNpmPackageManager, install} from './npm';

export const Npm7 = Object.freeze({
  name: 'npm7',

  ...BaseNpmPackageManager,

  async install(ctx: PkgManagerInstallContext): Promise<ExecResult> {
    return install(ctx, [
      '--no-audit',
      '--no-package-lock',
      '--global-style',
      '--json',
    ]);
  },

  supportedVersionRange: new Range('^7.0.0 || ^8.0.0'),

  versions: npmVersionData,
} as const) satisfies PkgManager;
