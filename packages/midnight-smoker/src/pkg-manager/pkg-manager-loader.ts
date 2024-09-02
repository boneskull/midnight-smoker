/* eslint-disable @typescript-eslint/no-base-to-string */
/**
 * Provides {@link loadPkgManagers}, which matches the known `PkgManager`
 * implementations to the requested package manager specification(s).
 *
 * @packageDocumentation
 */
import {DEFAULT_PKG_MANAGER_NAME, SYSTEM} from '#constants';
import {type PkgManagerEnvelope} from '#plugin/component-envelope';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {
  type DesiredPkgManager,
  DesiredPkgManagerSchema,
  parseDesiredPkgManagerSpec,
} from '#schema/desired-pkg-manager';
import {type PkgManager} from '#schema/pkg-manager';
import {
  isPartialStaticSystemPkgManagerSpec,
  isStaticPkgManagerSpec,
  type PartialStaticPkgManagerSpec,
  type PartialStaticSystemPkgManagerSpec,
  type StaticPkgManagerSpec,
} from '#schema/static-pkg-manager-spec';
import {RangeSchema} from '#schema/version';
import {type WorkspaceInfo} from '#schema/workspace-info';
import * as assert from '#util/assert';
import {createDebug} from '#util/debug';
import {FileManager} from '#util/filemanager';
import * as hwp from '#util/hwp';
import {isNonEmptyArray} from '#util/non-empty-array';
import {caseInsensitiveEquals} from '#util/util';
import execa from 'execa';
import {
  compact,
  filter,
  groupBy,
  head,
  isString,
  memoize,
  uniq,
  uniqBy,
} from 'lodash';
import path from 'node:path';
import {type Range, type SemVer} from 'semver';

import {PkgManagerSpec} from './pkg-manager-spec';
import {normalizeVersion, type VersionNormalizer} from './pkg-manager-version';

const debug = createDebug(__filename);

/**
 * Options for {@link loadPkgManagers}.
 */
export interface LoadPackageManagersOpts {
  /**
   * Current working directory (where `smoker` is run)
   */
  cwd?: string;

  /**
   * List of desired package managers. If not provided, then
   * {@link loadPkgManagers} will guess what to use by analyzing the filesystem.
   */
  desiredPkgManagers?: Readonly<DesiredPkgManager[]>;
}

type PkgManagerPluginPair = [
  pkgManagers: PkgManager[],
  plugin: Readonly<PluginMetadata>,
];

/**
 * {@link PkgManager}s may define a lockfile name. This searches for a matching
 * lockfile on disk.
 *
 * Used to determine the "default" package manager if one is unspecified.
 *
 * @param lockfileMap Mapping of lockfile names to package managers
 * @param fileManager `FileManager` instance
 * @param cwd Path to workspace
 * @returns A `PkgManager` if a matching lockfile is found
 */
async function getPkgManagerFromLockfile(
  lockfileMap: Readonly<Record<string, PkgManager[]>>,
  fileManager: FileManager,
  cwd: string,
): Promise<PkgManager | undefined> {
  const patterns = Object.keys(lockfileMap);

  return await hwp.find(
    fileManager.globIterate(patterns, {
      cwd,
      fs: fileManager.fs,
    }),
    async (lockfilePath, {signal}) => {
      if (signal.aborted) {
        return;
      }
      const lockfile = path.basename(lockfilePath);
      const pkgManagers = lockfileMap[lockfile];
      assert.ok(pkgManagers, 'Unknown lockfile');
      return head(pkgManagers);
    },
  );
}

/**
 * Memoized function to find the path to a system package manager.
 */
const findSystemPkgManagerPath = memoize(async (bin: string) => {
  try {
    const {stdout} = await execa.command(`which ${bin}`);
    return stdout.trim();
  } catch (err) {
    debug('Could not find %s in system path', bin);
  }
});

/**
 * Memoized function to get the version of a system package manager.
 */
const getSystemPkgManagerVersion = memoize(async (bin: string) => {
  try {
    const {stdout} = await execa.command(`${bin} --version`);
    return stdout.trim();
  } catch (err) {
    debug('Could not get version of %s', bin);
  }
});

/**
 * Check {@link WorkspaceInfo.pkgJson} for a `packageManager` field, and return
 * it if present and non-empty.
 *
 * @param cwd Workspace directory
 * @returns The contents of field `packageManager` specified in the workspace's
 *   `package.json` file, if any
 */
function getPkgManagerFromPackageJson({
  pkgJson,
}: WorkspaceInfo): string | undefined {
  if (pkgJson.packageManager && isString(pkgJson.packageManager)) {
    return pkgJson.packageManager;
  }
}

/**
 * If a user does not specify a package manager, we try to figure out what they
 * want.
 *
 * We look in two places:
 *
 * - `package.json` for a `packageManager` field
 * - If a package manager associates itself with a lockfile, we search for the
 *   presence of a lockfile.
 *
 * If we can't figure it out, we are going to use a "system" package manager.
 *
 * @param workspaceInfo List of workspaces
 * @param pkgManagers Array of package managers
 * @param fileManager FileManager instance
 * @returns A package manager spec
 */
export async function guessPackageManager(
  workspaceInfo: WorkspaceInfo[],
  pkgManagers: PkgManager[],
  fileManager = FileManager.create(),
): Promise<DesiredPkgManager> {
  /**
   * Grouping of lockfile name to package managers.
   *
   * Lazily loaded. Package managers can share lockfile names.
   */
  let pkgManagersByLockfile: Readonly<Record<string, PkgManager[]>>;
  let desiredPkgManager: DesiredPkgManager | undefined;

  for (const workspace of workspaceInfo) {
    const allegedDesiredPkgManager = getPkgManagerFromPackageJson(workspace);
    if (DesiredPkgManagerSchema.safeParse(allegedDesiredPkgManager).success) {
      desiredPkgManager = allegedDesiredPkgManager as DesiredPkgManager;
      break;
    }
    pkgManagersByLockfile = Object.freeze(
      groupBy(filter(pkgManagers, 'lockfile'), 'lockfile'),
    );

    const maybePkgManager = await getPkgManagerFromLockfile(
      pkgManagersByLockfile,
      fileManager,
      workspace.localPath,
    );

    if (maybePkgManager) {
      desiredPkgManager = `${maybePkgManager.name}@${SYSTEM}`;
      break;
    }
  }

  return desiredPkgManager ?? SYSTEM;
}

/**
 * Given an ostensibly non-empty list of desired package managers, make them
 * nice strings and remove dupes.
 *
 * @param desiredPkgManagers List of desired package managers
 * @returns Normalized list of desired package managers
 */
function normalizeDesiredPkgManagers(
  desiredPkgManagers: DesiredPkgManager[],
): DesiredPkgManager[] {
  return uniq(
    desiredPkgManagers.map((desiredPkgManager) => desiredPkgManager.trim()),
  ) as DesiredPkgManager[];
}

export type GetIdFn = (pkgManager: PkgManager) => string;

/**
 * Determines which `PkgManager`s to load based on user input.
 *
 * Returns {@link PkgManagerEnvelope}s, containing a spec matching the desired
 * package manager, the {@link PkgManager} itself, the plugin that provides it,
 * and the component ID of the `PkgManager`.
 *
 * @param plugin Plugin metadata, maybe containing package manager definitions
 * @param worksapceInfo Workspace information, used for inferring the pkg
 *   manager from the envrionment
 * @param fileManager Used for reading filesystem to guess a package manager
 * @param opts Optional package manager options
 * @returns An array of package manager envelopes, ready for handling by actors
 * @internal
 * @todo This should be decoupled. A lot.
 */
export async function loadPkgManagers(
  plugins: Readonly<PluginMetadata>[],
  workspaceInfo: WorkspaceInfo[],
  fileManager: FileManager,
  getId: GetIdFn,
  {desiredPkgManagers = []}: LoadPackageManagersOpts = {},
): Promise<PkgManagerEnvelope[]> {
  const pkgManagerPluginPairs: PkgManagerPluginPair[] = plugins.map(
    (plugin) => [plugin.pkgManagers, plugin],
  );

  /**
   * This will be the cached value of a "default" system package manager if a
   * system package manager guessed, and the user does not specify
   */
  let defaultSystemPkgManagerEnvelope: PkgManagerEnvelope | undefined;

  /**
   * Compares the "default" system package manager envelope to a partial spec to
   * check if whatever the user requested is the same as the system package
   * manager.
   *
   * Is not used if the user does not request any specific package managers.
   *
   * @param spec Partial spec of a package manager derived from desired spec
   *   string
   * @returns `true` if the system package manager envelope can be used to
   *   satisfy the spec
   */
  const defaultSystemPkgManagerEnvelopeMatchesSpec = (
    spec: PartialStaticPkgManagerSpec,
  ): boolean => {
    if (defaultSystemPkgManagerEnvelope) {
      // XXX: I still can't work out when this would be true. Test this!
      if (!spec.name) {
        return true;
      }
      return Boolean(
        spec.version &&
          caseInsensitiveEquals(
            spec.name,
            defaultSystemPkgManagerEnvelope.spec.name,
          ) &&
          caseInsensitiveEquals(
            spec.version,
            defaultSystemPkgManagerEnvelope.spec.version,
          ),
      );
    }
    return false;
  };

  const matchPackageManager = (
    desiredSpec: StaticPkgManagerSpec,
  ): PkgManagerEnvelope | undefined => {
    assert.ok(desiredSpec.version !== SYSTEM, 'Unexpected SYSTEM desired spec');

    for (const [pkgManagers, plugin] of pkgManagerPluginPairs) {
      // package managers
      const matchingPkgManagers = filterMatchingPkgManagers(
        desiredSpec,
        pkgManagers,
      );

      // try package managers until one accepts the version
      for (const pkgManager of matchingPkgManagers) {
        const version = accepts(pkgManager, desiredSpec.version);

        if (version) {
          return {
            id: getId(pkgManager),
            pkgManager,
            plugin,
            spec: PkgManagerSpec.create({
              ...desiredSpec,
              version,
            }),
          };
        }
      }
    }
  };

  /**
   * @param desiredSpec
   * @returns
   * @todo **Hazard** of side effects; this may set
   *   `defaultSystemPkgManagerEnvelope`
   */
  const matchSystemPackageManager = async (
    desiredSpec: PartialStaticSystemPkgManagerSpec,
  ): Promise<PkgManagerEnvelope | undefined> => {
    assert.ok(
      desiredSpec.version === SYSTEM,
      `Unexpected non-${SYSTEM} desired spec`,
    );
    for (const [pkgManagers, plugin] of pkgManagerPluginPairs) {
      for (const pkgManager of filterMatchingPkgManagers(
        desiredSpec,
        pkgManagers,
      )) {
        const {bin} = pkgManager;
        // does the system have this package manager?
        const binPath = await findSystemPkgManagerPath(bin);
        if (binPath) {
          // ok, great.  what version is the system package manager?
          const reportedVersion = await getSystemPkgManagerVersion(binPath);

          if (reportedVersion) {
            // now: does this PkgManager accept the reported version?
            const version = accepts(pkgManager, reportedVersion);
            if (version) {
              const systemSpec = PkgManagerSpec.create({
                // PkgManager.bin is the common name. PkgManager.name is the
                // unique name of the package manager component definition (e.g.
                bin: binPath,
                // npm9)
                name: bin,
                requestedAs: desiredSpec.requestedAs,
                version,
              });

              const envelope: PkgManagerEnvelope = {
                id: getId(pkgManager),
                pkgManager,
                plugin,
                spec: systemSpec,
              };

              // if we end up with multiple system package managers and no
              // lockfiles or `packageManager` in `package.json` to help us
              // guess, we will use the default package manager, which is `npm`.
              // because the order in which the PkgManagers are iterated is
              // nondeterministic, `npm` may not be the first one found; we
              // overwrite `defaultSystemPkgManagerEnvelope` in that case.

              // TODO: we could be more specific by checking the `id`, I suppose

              // TODO: I need to be convinced this works. test it
              if (
                !defaultSystemPkgManagerEnvelope ||
                (systemSpec.name === DEFAULT_PKG_MANAGER_NAME &&
                  defaultSystemPkgManagerEnvelope.spec.name !==
                    DEFAULT_PKG_MANAGER_NAME)
              ) {
                // 🚨
                defaultSystemPkgManagerEnvelope = envelope;
              }
              return envelope;
            }
          }
        }
      }
    }
  };

  if (isNonEmptyArray(pkgManagerPluginPairs)) {
    if (isNonEmptyArray(desiredPkgManagers)) {
      // use whatever the user said
      desiredPkgManagers = normalizeDesiredPkgManagers(desiredPkgManagers);
    } else {
      // user didn't specify which pkg manager they want; we need to guess
      const allPkgManagers = plugins.flatMap((plugin) => plugin.pkgManagers);
      // this should just contain a single package manager. it will end up
      // being the first one detected on the system.
      // TODO: default to `npm`.
      desiredPkgManagers = [
        await guessPackageManager(workspaceInfo, allPkgManagers, fileManager),
      ];
    }

    /**
     * Holey array of {@link PkgManagerEnvelope}s which have been matched from
     * {@link desiredPkgManagers}.
     */
    const maybeEnvelopes = await Promise.all(
      desiredPkgManagers.map(
        async (desiredPkgManager): Promise<PkgManagerEnvelope | undefined> => {
          const spec = parseDesiredPkgManagerSpec(desiredPkgManager);

          if (!spec) {
            // not parseable; this will throw an error later
            // TODO: maybe throw it now? or at least link to where it's thrown!?
            return;
          }

          // it's possible for the `defaultSystemPkgManagerEnvelope` to be
          // fulfilled multiple times from this iteration. the resulting array
          // will be deduped later.
          if (defaultSystemPkgManagerEnvelopeMatchesSpec(spec)) {
            return defaultSystemPkgManagerEnvelope;
          }

          // if this is the case, then the user wants to use a system package
          // manager. the user _may or may not_ have specified the *name* of this
          // package manager. if they haven't, we can use any supported system
          // package manager that we find. otherwise, we will need to pick the
          // one w/ the matching name.

          // TODO Check if it is possible, despite the stuff on ~L451, for this to
          // choose e.g., 'yarn' and then we're stuck with it.
          if (isPartialStaticSystemPkgManagerSpec(spec)) {
            return matchSystemPackageManager(spec);
          }

          // if the user gave us something we can actually work with, try to
          // get a match
          if (isStaticPkgManagerSpec(spec)) {
            return matchPackageManager(spec);
          }

          throw new Error('Should be unreachable; this is a bug');
        },
      ),
    );

    // we need to dedupe the array because `defaultSystemPkgManagerEnvelope` can
    // appear multiple times
    const envelopes = uniqBy(
      compact([...maybeEnvelopes, defaultSystemPkgManagerEnvelope]),
      'spec',
    );

    return envelopes;
  }

  return [];
}

loadPkgManagers.reset = () => {
  findSystemPkgManagerPath.cache = new Map();
  getSystemPkgManagerVersion.cache = new Map();
};

/**
 * Filter callback which finds all {@link PkgManager}s which match a partial
 * spec.
 *
 * We use {@link PkgManager.name} and {@link PkgManager.bin} to match against
 * {@link PartialStaticPkgManagerSpec.name}.
 *
 * @param spec Partial package manager spec
 * @param pkgManagers List of package managers
 * @returns Array of matching package managers
 */
export function filterMatchingPkgManagers(
  spec: PartialStaticPkgManagerSpec,
  pkgManagers: PkgManager[],
): PkgManager[] {
  const {name: specName} = spec;
  return specName
    ? pkgManagers.filter(
        (pkgManager) =>
          caseInsensitiveEquals(pkgManager.name, specName) ||
          caseInsensitiveEquals(pkgManager.bin, specName),
      )
    : pkgManagers;
}

/**
 * Returns a `SemVer` if the `pkgManager` can support `allegedVersion`.
 *
 * @param pkgManager Packaged manager
 * @param allegedVersion A requested version, tag, range, etc.
 * @returns `SemVer` if the requested version is supported by the package
 *   manager component, otherwise `undefined`
 */
export function accepts(
  pkgManager: PkgManager,
  allegedVersion: string,
): SemVer | undefined {
  const range = getRange(pkgManager);
  const normalize = getNormalizer(pkgManager);
  const version = normalize(allegedVersion);
  return version && range.test(version) ? version : undefined;
}

const normalizerMap = new WeakMap<PkgManager, VersionNormalizer>();
const rangeMap = new WeakMap<PkgManager, Range>();

/**
 * Parses the range of versions supported by a package manager from the
 * `supportedVesrionRange` field and caches it.
 *
 * @param pkgManager `PkgManager` instance
 * @returns SemVer {@link Range}
 * @todo Use `_.memoize()`?
 */
function getRange(pkgManager: PkgManager): Range {
  let range: Range;
  if (rangeMap.has(pkgManager)) {
    range = rangeMap.get(pkgManager)!;
  } else {
    range = RangeSchema.parse(pkgManager.supportedVersionRange);
    rangeMap.set(pkgManager, range);
  }
  return range;
}

/**
 * Creates a version normalizer from the `versions` field of a package manager
 * and caches it.
 *
 * The function. It caches the function.
 *
 * @param pkgManager `PkgManager` instance
 * @returns Version normalizer function accepting an alleged version or tag
 *   string
 */
function getNormalizer(pkgManager: PkgManager): VersionNormalizer {
  let normalize: VersionNormalizer;
  if (normalizerMap.has(pkgManager)) {
    normalize = normalizerMap.get(pkgManager)!;
  } else {
    normalize = normalizeVersion(pkgManager.versions);
    normalizerMap.set(pkgManager, normalize);
  }
  return normalize;
}
