import {ReifiedComponent} from '#component';
import {fromUnknownError} from '#error';
import {PackageManagerError} from '#error/pkg-manager-error';
import {type PluginMetadata} from '#plugin';
import {type InstallManifest} from '#schema/install-manifest';
import {type InstallResult} from '#schema/install-result';
import {
  type PkgManagerContext,
  type PkgManagerDef,
  type PkgManagerInstallContext,
  type PkgManagerPackContext,
  type PkgManagerRunScriptContext,
} from '#schema/pkg-manager-def';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {type RunScriptResult} from '#schema/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import Debug from 'debug';
import {isFunction} from 'lodash';
import {type PkgManagerSpec} from './pkg-manager-spec';

export type SomePkgManager = PkgManager;

export class PkgManager extends ReifiedComponent<PkgManagerDef> {
  constructor(
    id: string,
    def: PkgManagerDef,
    plugin: Readonly<PluginMetadata>,
    public readonly ctx: PkgManagerContext,
  ) {
    super(id, def, plugin);
  }

  public get spec(): PkgManagerSpec {
    return this.ctx.spec;
  }

  public get staticSpec(): StaticPkgManagerSpec {
    return this.ctx.spec.toJSON();
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

  public async install(
    installManifest: InstallManifest,
    signal: AbortSignal,
  ): Promise<InstallResult> {
    const ctx: PkgManagerInstallContext = {
      ...this.ctx,
      installManifest,
      signal,
    };
    const rawResult = await this.def.install(ctx);
    return {rawResult, installManifest};
  }

  public async pack(
    localPath: string,
    signal: AbortSignal,
  ): Promise<InstallManifest> {
    const ctx: PkgManagerPackContext = {
      ...this.ctx,
      signal,
      localPath,
    };
    const manifest = await this.def.pack(ctx);
    return {localPath, ...manifest};
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
