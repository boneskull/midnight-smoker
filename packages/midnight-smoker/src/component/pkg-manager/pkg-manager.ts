import {ReifiedComponent} from '#component';
import {fromUnknownError} from '#error';
import {PackageManagerError} from '#error/pkg-manager-error';
import {type PluginMetadata} from '#plugin';
import {type InstallManifest} from '#schema/install-manifest';
import {type InstallResult} from '#schema/install-result';
import {type PackOptions} from '#schema/pack-options';
import {type PkgInstallManifest} from '#schema/pkg-install-manifest';
import {
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
  type SupportedVersionRange,
} from '#schema/pkg-manager-def';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {type RunScriptResult} from '#schema/run-script-result';
import Debug from 'debug';
import {isFunction} from 'lodash';
import {type PkgManagerSpec} from './pkg-manager-spec';

export type SomePkgManager = PkgManager;

export class PkgManager extends ReifiedComponent<PkgManagerDef> {
  private installManifestMap: Map<string, InstallManifest> = new Map();
  private _installManifests: InstallManifest[] = [];
  private _installResult?: InstallResult;

  constructor(
    id: string,
    def: PkgManagerDef,
    plugin: Readonly<PluginMetadata>,
    public readonly ctx: PkgManagerContext,
  ) {
    super(id, def, plugin);
  }

  public get bin(): string {
    return this.def.bin;
  }

  public get installManifests(): InstallManifest[] {
    return this._installManifests;
  }

  public get installResult(): InstallResult | undefined {
    return this._installResult;
  }

  public get pkgInstallManifests(): PkgInstallManifest[] {
    return this.installManifests.filter(({isAdditional, installPath}) =>
      Boolean(installPath && !isAdditional),
    ) as PkgInstallManifest[];
  }

  public buildRunScriptManifests(scripts: string[]): RunScriptManifest[] {
    return this.pkgInstallManifests.flatMap(({installPath: cwd, pkgName}) =>
      scripts.map((script) => ({script, cwd, pkgName})),
    );
  }

  public get spec(): PkgManagerSpec {
    return this.ctx.spec;
  }

  public get supportedVersionRange(): SupportedVersionRange | undefined {
    return this.def.supportedVersionRange;
  }

  public get tmpdir(): string {
    return this.ctx.tmpdir;
  }

  public static create(
    this: void,
    id: string,
    def: PkgManagerDef,
    plugin: Readonly<PluginMetadata>,
    ctx: PkgManagerContext,
  ): PkgManager {
    return new PkgManager(id, def, plugin, ctx);
  }

  public addAdditionalDep(pkgSpec: string): void {
    if (this.installManifestMap.has(pkgSpec)) {
      throw new PackageManagerError(
        `Additional dep ${pkgSpec} is already installed!`,
        this.spec,
        new Error('Duplicate package name'),
      );
    }
    this._installManifests.push({
      cwd: this.ctx.tmpdir,
      pkgSpec,
      pkgName: pkgSpec,
      isAdditional: true,
    });
    debug('Added additional dep %s to pkg manager %s', pkgSpec, this.id);
  }

  public async install(
    installManifests: InstallManifest[] = this.installManifests,
  ): Promise<InstallResult> {
    if (this._installResult) {
      debug('Already installed');
      return this._installResult;
    }
    if (!installManifests.length) {
      throw new PackageManagerError(
        'No packages to install',
        this.spec,
        new Error('No packages to install'),
      );
    }
    const ctx: PkgManagerInstallContext = {...this.ctx, installManifests};
    const rawResult = await this.def.install(ctx);
    this._installResult = {
      rawResult,
      installManifests,
    };
    return this._installResult;
  }

  public async pack(opts: PackOptions = {}): Promise<InstallManifest[]> {
    const ctx: PkgManagerPackContext = {...this.ctx, ...opts};
    this._installManifests = await this.def.pack(ctx);

    for (const manifest of this._installManifests) {
      if (this.installManifestMap.has(manifest.pkgName)) {
        throw new PackageManagerError(
          `Duplicate package name: ${manifest.pkgName}`,
          this.spec,
          new Error('Duplicate package name'),
        );
      }
      this.installManifestMap.set(manifest.pkgName, manifest);
    }

    return this.installManifests;
  }

  public async runScript(
    runScriptManifest: RunScriptManifest,
    signal: AbortSignal,
  ): Promise<RunScriptResult> {
    const ctx: PkgManagerRunScriptContext = {
      ...this.ctx,
      runScriptManifest,
      signal,
    };
    return this.def.runScript(ctx);
  }

  public async setup(): Promise<void> {
    await Promise.resolve();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (isFunction(this.def.setup)) {
      debug('Setting up package manager %s', this.id);

      try {
        await this.def.setup(this.ctx);
      } catch (err) {
        throw new PackageManagerError(
          `Package manager ${this.id} setup failed`,
          this.spec,
          fromUnknownError(err),
        );
      }
    }
  }

  public async teardown(): Promise<void> {
    await Promise.resolve();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    if (isFunction(this.def.teardown)) {
      debug('Tearing down package manager %s', this.id);

      try {
        await this.def.teardown(this.ctx);
      } catch (err) {
        throw new PackageManagerError(
          `Package manager ${this.id} setup failed`,
          this.spec,
          fromUnknownError(err),
        );
      }
    }
  }
}

const debug = Debug('midnight-smoker:pkg-manager');
