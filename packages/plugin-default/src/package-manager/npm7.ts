import Debug from 'debug';
import {type ExecResult} from 'midnight-smoker/executor';
import {type PkgManagerInstallContext} from 'midnight-smoker/pkg-manager';
import {Range} from 'semver';
import {BaseNpmPackageManager} from './npm';

export class Npm7 extends BaseNpmPackageManager {
  protected override debug = Debug(`midnight-smoker:pm:npm7`);

  public override readonly supportedVersionRange = new Range(
    '^7.0.0 || ^8.0.0',
  );

  public override async install(
    ctx: PkgManagerInstallContext,
  ): Promise<ExecResult> {
    return this._install(ctx, [
      '--no-audit',
      '--no-package-lock',
      '--global-style',
      '--json',
    ]);
  }
}

export default Npm7;
