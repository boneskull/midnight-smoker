import {ReifiedComponent} from '#component';
import {fromUnknownError} from '#error';
import {PackageManagerError} from '#error/pkg-manager-error';
import {type PluginMetadata} from '#plugin';
import {type PkgManager as PkgManagerInstance} from '#schema/pkg-manager';
import {
  type PkgManagerContext,
  type PkgManagerDef,
} from '#schema/pkg-manager-def';
import {isFunction} from 'lodash';

export class PkgManager<Ctx = unknown> extends ReifiedComponent<PkgManagerDef> {
  private pkgManager?: PkgManagerInstance;
  constructor(
    def: PkgManagerDef,
    private readonly ctx: PkgManagerContext<Ctx>,
    plugin: Readonly<PluginMetadata>,
  ) {
    super(def, plugin);
  }

  public async setup() {
    await Promise.resolve();
    if (isFunction(this.def.setup)) {
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
  public async teardown() {
    await Promise.resolve();
    if (isFunction(this.def.teardown)) {
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

  public get install() {
    return this.pkgManager!.install;
  }

  public get pack() {
    return this.pkgManager!.pack;
  }

  public get runScript() {
    return this.pkgManager!.runScript;
  }

  public get spec() {
    return this.ctx.spec;
  }

  public get tmpdir() {
    return this.ctx.tmpdir;
  }

  public static create<Ctx = unknown>(
    this: void,
    def: PkgManagerDef,
    ctx: PkgManagerContext<Ctx>,
    plugin: Readonly<PluginMetadata>,
  ): PkgManager {
    return new PkgManager(def, ctx, plugin);
  }
}
