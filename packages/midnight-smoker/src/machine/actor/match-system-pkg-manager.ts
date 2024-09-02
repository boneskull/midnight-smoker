import {DEFAULT_PKG_MANAGER_NAME, SYSTEM} from '#constants';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {
  normalizeVersion,
  type VersionNormalizer,
} from '#pkg-manager/pkg-manager-version';
import {type ComponentRegistry} from '#plugin/component';
import {type PkgManagerEnvelope} from '#plugin/component-envelope';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PkgManager} from '#schema/pkg-manager';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {parseRange, RangeSchema} from '#schema/version';
import {caseInsensitiveEquals} from '#util/util';
import execa from 'execa';
import {type Range, type SemVer} from 'semver';
import which from 'which';
import {type DoneActorEvent, type ErrorActorEvent, fromPromise} from 'xstate';

const normalizerMap = new WeakMap<PkgManager, VersionNormalizer>();
const rangeMap = new WeakMap<PkgManager, Range>();

export type MatchSystemPkgManagerLogicInput = {
  componentRegistry: ComponentRegistry;
  defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
  plugins: Readonly<PluginMetadata>[];
  spec: StaticPkgManagerSpec;
};

export type MatchSystemPkgManagerLogicOutput = {
  defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
  envelope?: PkgManagerEnvelope;
};

export const matchSystemPkgManagerLogic = fromPromise<
  MatchSystemPkgManagerLogicOutput,
  MatchSystemPkgManagerLogicInput,
  DoneActorEvent<MatchSystemPkgManagerLogicOutput> | ErrorActorEvent
>(
  async ({
    input: {componentRegistry, defaultSystemPkgManagerEnvelope, plugins, spec},
  }) => {
    // assert.equal(spec.version, SYSTEM, `Unexpected non-${SYSTEM} desired spec`);

    /**
     * Filter callback which finds all {@link PkgManager}s which match a partial
     * spec.
     *
     * We use {@link PkgManager.name} and {@link PkgManager.bin} to match against
     * {@link StaticPkgManagerSpec.name}.
     *
     * @param spec Partial package manager spec
     * @param pkgManagers List of package managers
     * @returns Array of matching package managers
     */
    const filterMatchingPkgManagers = (
      spec: StaticPkgManagerSpec,
      pkgManagers: PkgManager[],
    ): PkgManager[] => {
      const {name: specName} = spec;
      return specName
        ? pkgManagers.filter(
            (pkgManager) =>
              caseInsensitiveEquals(pkgManager.name, specName) ||
              caseInsensitiveEquals(pkgManager.bin, specName),
          )
        : pkgManagers;
    };

    const findSystemPkgManagerPath = async (
      bin: string,
    ): Promise<string | undefined> => {
      const result = await which(bin, {nothrow: true});
      if (result) {
        return result;
      }
    };

    /**
     * Gget the version of a system package manager.
     */
    const getSystemPkgManagerVersion = async (
      bin: string,
    ): Promise<string | undefined> => {
      const command = `${bin} --version`;
      try {
        const {stdout} = await execa.command(command);
        return stdout.trim();
      } catch {}
    };

    /**
     * Parses the range of versions supported by a package manager from the
     * `supportedVesrionRange` field and caches it.
     *
     * @param pkgManager `PkgManager` instance
     * @returns SemVer {@link Range}
     * @todo Use `_.memoize()`?
     */
    const getRange = (pkgManager: PkgManager): Range => {
      let range: Range;
      if (rangeMap.has(pkgManager)) {
        range = rangeMap.get(pkgManager)!;
      } else {
        range = RangeSchema.parse(pkgManager.supportedVersionRange);
        rangeMap.set(pkgManager, range);
      }
      return range;
    };

    /**
     * Returns a `SemVer` if the `pkgManager` can support `allegedVersion`.
     *
     * @param pkgManager Packaged manager
     * @param allegedVersion A requested version, tag, range, etc.
     * @returns `SemVer` if the requested version is supported by the package
     *   manager component, otherwise `undefined`
     */
    const accepts = (
      pkgManager: PkgManager,
      allegedVersion: string,
    ): SemVer | undefined => {
      const range = getRange(pkgManager);
      const normalize = getNormalizer(pkgManager);
      const version = normalize(allegedVersion);
      return version && range.test(version) ? version : undefined;
    };

    /**
     * Creates a version normalizer from the `versions` field of a package
     * manager and caches it.
     *
     * The function. It caches the function.
     *
     * @param pkgManager `PkgManager` instance
     * @returns Version normalizer function accepting an alleged version or tag
     *   string
     */
    const getNormalizer = (pkgManager: PkgManager): VersionNormalizer => {
      let normalize: VersionNormalizer;
      if (normalizerMap.has(pkgManager)) {
        normalize = normalizerMap.get(pkgManager)!;
      } else {
        normalize = normalizeVersion(pkgManager.versions);
        normalizerMap.set(pkgManager, normalize);
      }
      return normalize;
    };

    for (const plugin of plugins) {
      const {pkgManagers} = plugin;
      for (const pkgManager of filterMatchingPkgManagers(spec, pkgManagers)) {
        const {bin} = pkgManager;

        // does the system have this package manager?
        const binPath = await findSystemPkgManagerPath(bin);
        if (binPath) {
          // ok, great.  what version is the system package manager?
          const reportedVersion = await getSystemPkgManagerVersion(binPath);
          if (reportedVersion) {
            // does the pkg manager accept the reported version?
            const version = accepts(pkgManager, reportedVersion);

            if (version && spec.version !== SYSTEM) {
              // and if set, is the spec version the same major version of the reported version?
              const range = parseRange(spec.version);
              if (!range?.test(version)) {
                continue;
              }
            }
            // now: does this PkgManager accept the reported version?
            if (version) {
              const systemSpec = PkgManagerSpec.create({
                // PkgManager.bin is the common name. PkgManager.name is the
                // unique name of the package manager component definition (e.g.
                bin: binPath,
                // npm9)
                name: bin,
                requestedAs: spec.requestedAs,
                version,
              });

              const pkgManagerComponent = componentRegistry.get(pkgManager);
              if (pkgManagerComponent) {
                const {id} = pkgManagerComponent;

                const envelope: PkgManagerEnvelope = {
                  id,
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
                return {defaultSystemPkgManagerEnvelope, envelope};
              }
            }
          }
        }
      }
    }

    return {};
  },
);
