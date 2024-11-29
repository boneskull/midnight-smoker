import {DEFAULT_PKG_MANAGER_NAME, SYSTEM} from 'midnight-smoker/constants';
import {type PkgManager} from 'midnight-smoker/defs/pkg-manager';
import {
  normalizeVersionAgainstPkgManager,
  PkgManagerSpec,
} from 'midnight-smoker/pkg-manager';
import {
  type ComponentRegistry,
  type PkgManagerEnvelope,
  type PluginMetadata,
} from 'midnight-smoker/plugin';
import {
  type ExecFn,
  parseRange,
  type StaticPkgManagerSpec,
} from 'midnight-smoker/schema';
import {caseInsensitiveEquals, exec} from 'midnight-smoker/util';
import {type SemVer} from 'semver';
import which from 'which';
import {type DoneActorEvent, type ErrorActorEvent, fromPromise} from 'xstate';

export type WhichFn = (
  bin: string,
  options: {nothrow: boolean},
) => Promise<string | undefined>;

export type MatchSystemPkgManagerLogicInput = {
  componentRegistry: ComponentRegistry;
  defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
  exec?: ExecFn;
  plugins: Readonly<PluginMetadata>[];
  spec: StaticPkgManagerSpec;
  which?: WhichFn;
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
    input: {
      componentRegistry,
      defaultSystemPkgManagerEnvelope,
      exec: someExec = exec,
      plugins,
      spec,
      which: someWhich = which,
    },
  }) => {
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

    /**
     * Finds a system package manager executable in `PATH` via a {@link WhichFn}
     *
     * @param bin Executable name of the system package manager
     * @returns A promise resolving with the path or `undefined` if not found
     */
    const findSystemPkgManagerPath = async (
      bin: string,
    ): Promise<string | undefined> => {
      const result = await someWhich(bin, {nothrow: true});
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
      try {
        const {stdout} = await someExec(bin, ['--version']);
        return stdout;
      } catch (err) {
        err;
      }
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
      // the pkgManager should already have been validated, so it's
      // safe to parse the range with `strict: true`
      const range = parseRange(pkgManager.supportedVersionRange, {
        strict: true,
      });
      const version = normalizeVersionAgainstPkgManager(
        pkgManager,
        allegedVersion,
      );
      return version && range.test(version) ? version : undefined;
    };

    for (const plugin of plugins) {
      const {pkgManagers} = plugin;

      // find the package manager(s) that match the PkgManagerrSpec
      for (const pkgManager of filterMatchingPkgManagers(spec, pkgManagers)) {
        const {bin} = pkgManager;

        // does the system have this package manager?
        const binPath = await findSystemPkgManagerPath(bin);
        if (binPath) {
          // ok, great.  what version is the system package manager?
          const reportedVersion = await getSystemPkgManagerVersion(binPath);
          if (reportedVersion) {
            // does the pkg manager accept the reported version?
            const acceptedVersion = accepts(pkgManager, reportedVersion);

            if (acceptedVersion) {
              // a "system" range means "whatever's there"
              if (spec.version !== SYSTEM) {
                // `spec.version` is an unknown at this point, but we can now
                // attempt to normalize it against known package manager versions
                // (even if it's a dist tag)
                const desiredVersion = normalizeVersionAgainstPkgManager(
                  pkgManager,
                  spec.version,
                );
                // this wants an exact match. if the user wants different behavior,
                // then provide "system" as the version
                if (desiredVersion?.compare(acceptedVersion) !== 0) {
                  continue;
                }
              }

              // read: we are essentially _replacing_ the partial `spec` with
              // this new one.
              const systemSpec = PkgManagerSpec.create({
                // PkgManager.bin is the common name. PkgManager.name is the
                // unique name of the package manager component definition (e.g.
                // npm9)
                bin: binPath,
                name: bin,
                requestedAs: spec.requestedAs,
                version: acceptedVersion,
              });

              // to build the envelope, we need the pkg manager component's ID.
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
                // it's also highly unlikely that `npm` won't exist.

                if (
                  !defaultSystemPkgManagerEnvelope ||
                  (systemSpec.name === DEFAULT_PKG_MANAGER_NAME &&
                    defaultSystemPkgManagerEnvelope.spec.name !==
                      DEFAULT_PKG_MANAGER_NAME)
                ) {
                  defaultSystemPkgManagerEnvelope = envelope;
                }

                // it's expected that the caller sends
                // `defaultSystemPkgManagerEnvelope` back to us on subsequent
                // calls
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
