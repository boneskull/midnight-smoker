import {type ExecResult} from 'midnight-smoker/executor';
import {
  type PkgManager,
  type PkgManagerInstallContext,
} from 'midnight-smoker/pkg-manager';
import {Range} from 'semver';

import {install} from './npm';
import {Npm7} from './npm7';

export const Npm9 = Object.freeze({
  ...Npm7,
  async install(ctx: PkgManagerInstallContext): Promise<ExecResult> {
    return install(ctx, [
      '--no-audit',
      '--no-package-lock',
      '--install-strategy=shallow',
      '--json',
    ]);
  },
  name: 'npm9',

  supportedVersionRange: new Range('>=9.0.0'),
} as const) satisfies PkgManager;
