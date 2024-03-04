import Debug from 'debug';
import {isError} from 'lodash';
import {PackError, PackParseError} from 'midnight-smoker/error';
import {type ExecError, type ExecResult} from 'midnight-smoker/executor';
import {
  normalizeVersion,
  type InstallManifest,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
} from 'midnight-smoker/pkg-manager';
import path from 'node:path';
import {Range} from 'semver';
import {npmVersionData} from './data';
import {BaseNpmPackageManager, type NpmPackItem} from './npm';

export class Npm7 extends BaseNpmPackageManager {
  protected override debug = Debug(`midnight-smoker:pm:npm7`);

  public override readonly supportedVersionRange = new Range(
    '^7.0.0 || ^8.0.0',
  );

  public override accepts(value: string) {
    const version = normalizeVersion(npmVersionData, value);
    if (version && this.supportedVersionRange.test(version)) {
      return version;
    }
  }

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

  public override async pack(
    ctx: PkgManagerPackContext,
  ): Promise<InstallManifest[]> {
    let packArgs = [
      'pack',
      '--json',
      `--pack-destination=${ctx.tmpdir}`,
      '--foreground-scripts=false', // suppress output of lifecycle scripts so json can be parsed
    ];
    if (ctx.workspaces?.length) {
      packArgs = [
        ...packArgs,
        ...ctx.workspaces.map((w) => `--workspace=${w}`),
      ];
    } else if (ctx.allWorkspaces) {
      packArgs = [...packArgs, '--workspaces'];
      if (ctx.includeWorkspaceRoot) {
        packArgs = [...packArgs, '--include-workspace-root'];
      }
    }

    let packResult: ExecResult;

    try {
      packResult = await ctx.executor(ctx.spec, packArgs);
    } catch (e) {
      this.debug('(pack) Failed: %O', e);
      const err = e as ExecError;
      if (err.id === 'ExecError') {
        // in some cases we can get something more user-friendly via the JSON output
        const parsedError = this.parseNpmError(err.stdout);

        if (parsedError) {
          throw new PackError(parsedError.summary, `${ctx.spec}`, ctx.tmpdir, {
            error: parsedError,
            output: err.stderr,
            exitCode: err.exitCode,
          });
        }

        throw new PackError(
          `Use --verbose for more information`,
          `${ctx.spec}`,
          ctx.tmpdir,
          {error: err},
        );
      }
      throw e;
    }

    let parsed: NpmPackItem[];

    const {stdout: packOutput} = packResult;
    try {
      parsed = JSON.parse(packOutput) as NpmPackItem[];
      this.debug(
        '(pack) Packed: %O',
        parsed.map(({filename, name, files}) => ({
          filename,
          name,
          files: files.map((file) => file.path),
        })),
      );
    } catch (err) {
      this.debug('(pack) Failed to parse JSON: %s', packOutput);
      throw isError(err)
        ? new PackParseError(
            `Failed to parse JSON result of "npm pack"`,
            `${ctx.spec}`,
            err,
            packOutput,
          )
        : err;
    }

    const installManifest = parsed.map(({filename, name}) => {
      // workaround for https://github.com/npm/cli/issues/3405
      filename = filename.replace(/^@(.+?)\//, '$1-');
      return {
        spec: path.join(ctx.tmpdir, filename),
        installPath: path.join(ctx.tmpdir, 'node_modules', name),
        cwd: ctx.tmpdir,
        pkgName: name,
      };
    });
    this.debug('(pack) Packed %d packages', installManifest.length);

    return installManifest;
  }
}

export default Npm7;
