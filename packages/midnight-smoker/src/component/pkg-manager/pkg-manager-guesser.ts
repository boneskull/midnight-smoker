/**
 * Provides {@link guessPackageManager}.
 *
 * @packageDocumentation
 */
import type {PkgManagerDef} from '#schema/pkg-manager-def.js';
import {getSystemPkgManagerVersion, readPackageJson} from '#util/pkg-util.js';
import {globIterate} from 'glob';
import {PkgManagerSpec} from './pkg-manager-spec';

/**
 * Given the `lockfile` specified in the provided {@link PkgManagerDef} objects,
 * looks in `cwd` for them.
 *
 * Returns the first found.
 *
 * @param pkgManagerDefs - An array of `PkgManagerDef` objects.
 * @param cwd - Path with ancestor `package.json` file
 * @returns Package manager bin, if found
 */
async function getPkgManagerFromLockfiles(
  pkgManagerDefs: PkgManagerDef[],
  cwd = process.cwd(),
): Promise<string | undefined> {
  // each PkgManagerDef is responsible for setting its lockfile
  const lockfileMap = Object.fromEntries(
    pkgManagerDefs
      .filter((def) => Boolean(def.lockfile))
      .map((def) => [def.lockfile!, def.bin]),
  );

  for await (const match of globIterate(Object.keys(lockfileMap), {cwd})) {
    if (match in lockfileMap) {
      return lockfileMap[match];
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
async function getPkgManagerFromPackageJson(
  cwd = process.cwd(),
): Promise<Readonly<PkgManagerSpec> | undefined> {
  const result = await readPackageJson({cwd});

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
 * 2. Look for a lockfile in the closest `package.json` from `cwd` that matches one
 *    of the `lockfile` fields as specified by the {@link PkgManagerDef} objects
 * 3. Use the default package manager (npm)
 *
 * In the first case, we are assuming the field is a complete "package manager
 * spec" (with version). In the other two cases, we don't know what version is
 * involved, so we'll just use the "system" package manager.
 *
 * @param pkgManagerDefs - Package manager definitions as provided by plugins
 * @param cwd - Current working directory having an ancestor `package.json` file
 * @returns Package manager spec
 */
export async function guessPackageManager(
  pkgManagerDefs: PkgManagerDef[],
  cwd = process.cwd(),
): Promise<Readonly<PkgManagerSpec>> {
  // this should be tried first, as it's "canonical"
  let spec = await getPkgManagerFromPackageJson(cwd);

  if (!spec) {
    const pkgManager = await getPkgManagerFromLockfiles(pkgManagerDefs, cwd);
    if (pkgManager) {
      const version = await getSystemPkgManagerVersion(pkgManager);
      spec = PkgManagerSpec.create({pkgManager, version, isSystem: true});
    }
  }

  return spec ?? PkgManagerSpec.create();
}
