import Debug from 'debug';
import {
  Errors,
  type Executor,
  type Helpers,
  type PkgManager,
} from 'midnight-smoker/plugin';
import path from 'node:path';
import {GenericNpmPackageManager} from './npm';

/**
 * Type of item in the {@linkcode NpmPackItem.files} array.
 *
 * @internal
 */
export interface NpmPackItemFileEntry {
  mode: number;
  path: string;
  size: number;
}

/**
 * JSON output of `npm pack`
 *
 * @internal
 */
export interface NpmPackItem {
  bundled: any[];
  entryCount: number;
  filename: string;
  files: NpmPackItemFileEntry[];
  id: string;
  integrity: string;
  name: string;
  shasum: string;
  size: number;
  unpackedSize: number;
  version: string;
}

export class Npm7
  extends GenericNpmPackageManager
  implements PkgManager.PkgManager
{
  protected debug: Debug.Debugger;

  public static readonly bin = 'npm';
  public readonly name = 'npm';

  public constructor(
    id: string,
    executor: Executor.Executor,
    tmpdir: string,
    opts: PkgManager.PkgManagerOpts = {},
  ) {
    super(id, executor, tmpdir, opts);
    this.debug = Debug(`midnight-smoker:pm:npm7`);
  }

  public static accepts = '^7.0.0 || ^8.0.0';

  public static async create(
    this: void,
    id: string,
    executor: Executor.Executor,
    helpers: typeof Helpers,
    opts?: PkgManager.PkgManagerOpts,
  ) {
    const tempdir = await helpers.createTempDir();
    return new Npm7(id, executor, tempdir, opts);
  }

  protected handleInstallError(
    errOrResult: Executor.ExecError | Executor.ExecResult,
    installSpecs: string[],
  ) {
    const parsedError = this.parseNpmError(errOrResult.stdout);
    if (parsedError) {
      return new Errors.InstallError(
        parsedError.summary,
        this.spec,
        installSpecs,
        this.tmpdir,
        {
          error: parsedError,
          output: errOrResult.all || errOrResult.stderr || errOrResult.stdout,
          exitCode: errOrResult.exitCode,
        },
      );
    } else if (errOrResult.exitCode > 0) {
      return new Errors.InstallError(
        `Use --verbose for more information`,
        this.spec,
        installSpecs,
        this.tmpdir,
        {
          output: errOrResult.all || errOrResult.stderr || errOrResult.stdout,
          exitCode: errOrResult.exitCode,
        },
      );
    } else if (errOrResult instanceof Error) {
      return new Errors.InstallError(
        'Use --verbose for more information',
        this.spec,
        installSpecs,
        this.tmpdir,
        {
          output: errOrResult.all || errOrResult.stderr || errOrResult.stdout,
          exitCode: errOrResult.exitCode,
        },
        errOrResult,
      );
    }
  }

  public async install(
    installManifests: PkgManager.InstallManifest[],
  ): Promise<Executor.ExecResult> {
    if (!installManifests.length) {
      throw new Errors.InvalidArgError(
        'installManifests must be a non-empty array',
        {argName: 'installManifests'},
      );
    }

    const installSpecs = installManifests.map(({spec}) => spec);
    let err: Errors.InstallError | undefined;
    const installArgs = [
      'install',
      '--no-audit',
      '--no-package-lock',
      '--global-style',
      '--json',
      ...installSpecs,
    ];

    let installResult: Executor.ExecResult;
    try {
      installResult = await this.executor(
        this.spec,
        installArgs,
        {},
        {cwd: this.tmpdir},
      );
      err = this.handleInstallError(installResult, installSpecs);
    } catch (e) {
      err = this.handleInstallError(e as Executor.ExecError, installSpecs);
    }
    if (err) {
      throw err;
    }
    this.debug('(install) Installed %d packages', installSpecs.length);
    return installResult!;
  }

  public async pack(
    opts: PkgManager.PackOptions = {},
  ): Promise<PkgManager.InstallManifest[]> {
    let packArgs = [
      'pack',
      '--json',
      `--pack-destination=${this.tmpdir}`,
      '--foreground-scripts=false', // suppress output of lifecycle scripts so json can be parsed
    ];
    if (opts.workspaces?.length) {
      packArgs = [
        ...packArgs,
        ...opts.workspaces.map((w) => `--workspace=${w}`),
      ];
    } else if (opts.allWorkspaces) {
      packArgs = [...packArgs, '--workspaces'];
      if (opts.includeWorkspaceRoot) {
        packArgs = [...packArgs, '--include-workspace-root'];
      }
    }

    let packResult: Executor.ExecResult;

    try {
      packResult = await this.executor(this.spec, packArgs);
    } catch (e) {
      const err = e as Executor.ExecError;
      this.debug('(pack) Failed: %O', err);
      // in some cases we can get something more user-friendly via the JSON output
      const parsedError = this.parseNpmError(err.stdout);

      if (parsedError) {
        throw new Errors.PackError(
          parsedError.summary,
          this.spec,
          this.tmpdir,
          {error: parsedError, output: err.stderr, exitCode: err.exitCode},
        );
      }

      throw new Errors.PackError(
        `Use --verbose for more information`,
        this.spec,
        this.tmpdir,
        {error: err},
      );
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
      throw new Errors.PackParseError(
        `Failed to parse JSON result of pack from package manager "${this.name}"`,
        this.name,
        err as Error,
        packOutput,
      );
    }

    const installManifest = parsed.map(({filename, name}) => {
      // workaround for https://github.com/npm/cli/issues/3405
      filename = filename.replace(/^@(.+?)\//, '$1-');
      return {
        spec: path.join(this.tmpdir, filename),
        installPath: path.join(this.tmpdir, 'node_modules', name),
        cwd: this.tmpdir,
        pkgName: name,
      };
    });
    this.debug('(pack) Packed %d packages', installManifest.length);

    return installManifest;
  }
}

export default Npm7 satisfies PkgManager.PkgManagerDef;
