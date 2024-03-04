import Debug from 'debug';
import {type ExecResult} from 'midnight-smoker/executor';
import {type PkgManagerInstallContext} from 'midnight-smoker/pkg-manager';
import {Range} from 'semver';
import {Npm7} from './npm7';

export class Npm9 extends Npm7 {
  protected override debug = Debug(`midnight-smoker:pm:npm9`);

  public override readonly supportedVersionRange = new Range('>=9.0.0');

  public override async install(
    ctx: PkgManagerInstallContext,
  ): Promise<ExecResult> {
    return this._install(ctx, [
      '--no-audit',
      '--no-package-lock',
      '--install-strategy=shallow',
      '--json',
    ]);
  }
}

export default Npm9;
