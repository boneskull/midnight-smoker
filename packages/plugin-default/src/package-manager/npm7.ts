import Debug from 'debug';
import {isError} from 'lodash';
import {PackError, PackParseError} from 'midnight-smoker/error';
import {
  type ExecError,
  type ExecResult,
  type Executor,
} from 'midnight-smoker/executor';
import {
  normalizeVersion,
  type InstallManifest,
  type PackOptions,
  type PkgManager,
  type PkgManagerDef,
  type PkgManagerOpts,
  type PkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import {type PluginHelpers} from 'midnight-smoker/plugin';
import path from 'node:path';
import {Range} from 'semver';
import {npmVersionData} from './data';
import {GenericNpmPackageManager, type NpmPackItem} from './npm';

export class Npm7 extends GenericNpmPackageManager implements PkgManager {
  protected debug: Debug.Debugger;

  public static readonly bin = 'npm';
  public static readonly supportedVersionRange = new Range('^7.0.0 || ^8.0.0');

  public constructor(
    spec: PkgManagerSpec,
    executor: Executor,
    tmpdir: string,
    opts: PkgManagerOpts = {},
  ) {
    super(spec, executor, tmpdir, opts);
    this.debug = Debug(`midnight-smoker:pm:npm7`);
  }

  public static accepts(value: string) {
    const version = normalizeVersion(npmVersionData, value);
    if (version && Npm7.supportedVersionRange.test(version)) {
      return version;
    }
  }

  public static async create(
    this: void,
    spec: PkgManagerSpec,
    executor: Executor,
    helpers: PluginHelpers,
    opts?: PkgManagerOpts,
  ) {
    const tempdir = await helpers.createTempDir();
    return new Npm7(spec, executor, tempdir, opts);
  }

  public async install(
    installManifests: InstallManifest[],
  ): Promise<ExecResult> {
    return this._install(installManifests, [
      '--no-audit',
      '--no-package-lock',
      '--global-style',
      '--json',
    ]);
  }

  public async pack(opts: PackOptions = {}): Promise<InstallManifest[]> {
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

    let packResult: ExecResult;

    try {
      packResult = await this.executor(this.spec, packArgs);
    } catch (e) {
      this.debug('(pack) Failed: %O', e);
      const err = e as ExecError;
      if (err.id === 'ExecError') {
        // in some cases we can get something more user-friendly via the JSON output
        const parsedError = this.parseNpmError(err.stdout);

        if (parsedError) {
          throw new PackError(
            parsedError.summary,
            `${this.spec}`,
            this.tmpdir,
            {error: parsedError, output: err.stderr, exitCode: err.exitCode},
          );
        }

        throw new PackError(
          `Use --verbose for more information`,
          `${this.spec}`,
          this.tmpdir,
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
            `${this.spec}`,
            err,
            packOutput,
          )
        : err;
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

export default Npm7 satisfies PkgManagerDef;
