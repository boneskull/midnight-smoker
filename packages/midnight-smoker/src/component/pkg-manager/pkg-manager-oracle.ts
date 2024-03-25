/**
 * Provides {@link guessPackageManager}.
 *
 * @packageDocumentation
 */
import type {PkgManagerDef} from '#schema/pkg-manager-def';
import {getSystemPkgManagerVersion} from '#util/pkg-util';
import {globIterate} from 'glob';
import path from 'node:path';
import {FileManager, type FileManagerOpts} from '../../util';
import {PkgManagerSpec} from './pkg-manager-spec';

export interface PkgManagerOracleOpts {
  getSystemPkgManagerVersion?: (bin: string) => Promise<string>;
  fileManagerOpts?: FileManagerOpts;
}

export class PkgManagerOracle {
  #getSystemPkgManagerVersion: (bin: string) => Promise<string>;

  #fm: FileManager;

  constructor(opts: PkgManagerOracleOpts = {}) {
    this.#getSystemPkgManagerVersion =
      opts.getSystemPkgManagerVersion ?? getSystemPkgManagerVersion;
    this.#fm = FileManager.create(opts.fileManagerOpts);
  }

  /**
   * Given the `lockfile` specified in the provided {@link PkgManagerDef}
   * objects, looks in `cwd` for them.
   *
   * Returns the first found.
   *
   * @param pkgManagerDefs - An array of `PkgManagerDef` objects.
   * @param cwd - Path with ancestor `package.json` file
   * @returns Package manager bin, if found
   */
  async getPkgManagerFromLockfiles(
    pkgManagerDefs: PkgManagerDef[],
    cwd = process.cwd(),
  ): Promise<string | undefined> {
    // each PkgManagerDef is responsible for setting its lockfile
    const lockfileMap = new Map(
      pkgManagerDefs
        .filter((def) => Boolean(def.lockfile))
        .map((def) => [path.join(cwd, def.lockfile!), def.bin]),
    );

    const patterns = [...lockfileMap.keys()];

    for await (const match of globIterate(patterns, {
      fs: this.#fm.fs,
      cwd,
      absolute: false,
    })) {
      if (lockfileMap.has(match)) {
        return lockfileMap.get(match)!;
      }
    }
  }

  /**
   * Looks at the closest `package.json` to `cwd` in the `packageManager` field
   * for a value.
   *
   * This should _not_ be a "system" package manager.
   *
   * @param cwd Path with ancestor `package.json` file.
   * @returns Package manager spec, if found
   */
  async getPkgManagerFromPackageJson(
    cwd = process.cwd(),
  ): Promise<Readonly<PkgManagerSpec> | undefined> {
    const result = await this.#fm.findPkgUp(cwd);

    const pkgManager = result?.packageJson.packageManager;

    if (pkgManager) {
      return PkgManagerSpec.from(pkgManager);
    }
  }

  /**
   * Attempts to guess which package manager to use if none were provided by the
   * user.
   *
   * The strategy is:
   *
   * 1. Look for a `packageManager` field in the closest `package.json` from `cwd`
   * 2. Look for a lockfile in the closest `package.json` from `cwd` that matches
   *    one of the `lockfile` fields as specified by the {@link PkgManagerDef}
   *    objects
   * 3. Use the default package manager (npm)
   *
   * In the first case, we are assuming the field is a complete "package manager
   * spec" (with version). In the other two cases, we don't know what version is
   * involved, so we'll just use the "system" package manager.
   *
   * @param pkgManagerDefs - Package manager definitions as provided by plugins
   * @param cwd - Current working directory having an ancestor `package.json`
   *   file
   * @returns Package manager spec
   */
  async guessPackageManager(
    pkgManagerDefs: PkgManagerDef[],
    cwd = process.cwd(),
  ): Promise<Readonly<PkgManagerSpec>> {
    // this should be tried first, as it's "canonical"
    let spec = await this.getPkgManagerFromPackageJson(cwd);

    if (!spec) {
      const pkgManager = await this.getPkgManagerFromLockfiles(
        pkgManagerDefs,
        cwd,
      );
      if (pkgManager) {
        const version = await this.#getSystemPkgManagerVersion(pkgManager);
        spec = PkgManagerSpec.create({pkgManager, version, isSystem: true});
      }
    }

    return spec ?? PkgManagerSpec.create();
  }

  static guessPackageManager(
    this: void,
    pkgManagerDefs: PkgManagerDef[],
    cwd?: string,
  ): Promise<Readonly<PkgManagerSpec>> {
    return new PkgManagerOracle().guessPackageManager(pkgManagerDefs, cwd);
  }
}

export const {guessPackageManager} = PkgManagerOracle;
