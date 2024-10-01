import {ERROR, FINAL, OK, SYSTEM} from '#constants';
import {MachineError} from '#error/machine-error';
import {
  matchSystemPkgManagerLogic,
  type MatchSystemPkgManagerLogicInput,
  type MatchSystemPkgManagerLogicOutput,
} from '#machine/actor/match-system-pkg-manager';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {normalizeVersionAgainstPkgManager} from '#pkg-manager/version-normalizer';
import {type ComponentRegistry} from '#plugin/component';
import {type PkgManagerEnvelope} from '#plugin/component-envelope';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {
  type DesiredPkgManager,
  parseDesiredPkgManagerSpec,
} from '#schema/desired-pkg-manager';
import {type PkgManager} from '#schema/pkg-manager';
import {
  type PartialStaticPkgManagerSpec,
  type StaticPkgManagerSpec,
} from '#schema/static-pkg-manager-spec';
import {RangeSchema} from '#schema/version';
import * as assert from '#util/assert';
import {caseInsensitiveEquals} from '#util/common';
import {fromUnknownError} from '#util/from-unknown-error';
import {isKnownPkgManagerSpec} from '#util/guard/known-pkg-manager-spec';
import {isStaticPkgManagerSpec} from '#util/guard/static-pkg-manager-spec';
import {type Range, type SemVer} from 'semver';
import {assign, log, setup} from 'xstate';

import {
  type ActorOutputError,
  type ActorOutputOk,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
} from './util';

export type ParsePkgManagerSpecMachineOutput =
  | ParsePkgManagerSpecMachineOutputError
  | ParsePkgManagerSpecMachineOutputOk;

export type ParsePkgManagerSpecMachineOutputError = ActorOutputError<
  MachineError,
  {
    defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
    desiredPkgManager: DesiredPkgManager;
  }
>;

export type ParsePkgManagerSpecMachineOutputOk = ActorOutputOk<{
  defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
  desiredPkgManager: DesiredPkgManager;
  envelope?: PkgManagerEnvelope;
}>;

export interface ParsePkgManagerSpecMachineContext
  extends ParsePkgManagerSpecMachineInput {
  envelope?: PkgManagerEnvelope;
  error?: MachineError;
  spec: StaticPkgManagerSpec;
}

export interface ParsePkgManagerSpecMachineInput {
  componentRegistry: ComponentRegistry;
  defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
  desiredPkgManager: DesiredPkgManager;
  didGuess?: boolean;
  plugins: Readonly<PluginMetadata>[];
}

/**
 * Returns a `SemVer` if the `pkgManager` can support `allegedVersion`.
 *
 * @param pkgManager Packaged manager
 * @param allegedVersion A requested version, tag, range, etc.
 * @returns `SemVer` if the requested version is supported by the package
 *   manager component, otherwise `undefined`
 */
function accepts(
  pkgManager: PkgManager,
  allegedVersion: string,
): SemVer | undefined {
  const range = getRange(pkgManager);
  const normalize = normalizeVersionAgainstPkgManager(pkgManager);
  const version = normalize(allegedVersion);
  return version && range.test(version) ? version : undefined;
}

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
function filterMatchingPkgManagers(
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

const rangeMap = new WeakMap<PkgManager, Range>();

/**
 * @internal
 */
export const ParsePkgManagerSpecMachine = setup({
  actions: {
    /**
     * Assigns the result of {@link matchSystemPkgManagerLogic} to the context
     */
    assignEnvelopes: assign({
      defaultSystemPkgManagerEnvelope: (
        {context: {defaultSystemPkgManagerEnvelope}},
        output: MatchSystemPkgManagerLogicOutput,
      ): PkgManagerEnvelope | undefined =>
        defaultSystemPkgManagerEnvelope ??
        output.defaultSystemPkgManagerEnvelope,
      envelope: (
        {context: {envelope}},
        output: MatchSystemPkgManagerLogicOutput,
      ): PkgManagerEnvelope => envelope ?? output.envelope!,
    }),
    assignError: assign({
      error: ({context, self}, {error: err}: {error: unknown}) => {
        const error = fromUnknownError(err);
        if (context.error) {
          return context.error.cloneWith(error);
        }

        return new MachineError(
          `Package manager spec parser encountered an error`,
          error,
          self.id,
        );
      },
    }),
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),
  },
  actors: {
    matchSystemPkgManager: matchSystemPkgManagerLogic,
  },
  types: {
    context: {} as ParsePkgManagerSpecMachineContext,
    input: {} as ParsePkgManagerSpecMachineInput,
    output: {} as ParsePkgManagerSpecMachineOutput,
  },
}).createMachine({
  context: ({input: {desiredPkgManager = SYSTEM, didGuess, ...input}}) => {
    let spec = parseDesiredPkgManagerSpec(desiredPkgManager);
    if (didGuess) {
      spec = {...spec, requestedAs: undefined};
    }
    return {
      ...input,
      desiredPkgManager,
      spec,
    };
  },
  entry: [
    INIT_ACTION,
    log(
      ({context: {desiredPkgManager, spec}}) =>
        `"${desiredPkgManager}" -> ${JSON.stringify(spec)}`,
    ),
  ],
  initial: 'matchDefaultSystemPkgManager',
  output: ({
    context: {
      defaultSystemPkgManagerEnvelope,
      desiredPkgManager,
      envelope,
      error,
    },
    self: {id: actorId},
  }) =>
    error
      ? {
          actorId,
          defaultSystemPkgManagerEnvelope,
          desiredPkgManager,
          error,
          type: ERROR,
        }
      : {
          actorId,
          defaultSystemPkgManagerEnvelope,
          desiredPkgManager,
          envelope,
          type: OK,
        },
  states: {
    done: {
      type: FINAL,
    },
    errored: {
      type: FINAL,
    },
    matchDefaultSystemPkgManager: {
      always: [
        {
          actions: [
            assign({
              envelope: ({
                context: {defaultSystemPkgManagerEnvelope},
              }): PkgManagerEnvelope | undefined =>
                defaultSystemPkgManagerEnvelope,
            }),
            log(
              ({context: {desiredPkgManager}}) =>
                `${desiredPkgManager}: Matched default system package manager`,
            ),
          ],
          guard: ({
            context: {defaultSystemPkgManagerEnvelope, spec},
          }): boolean =>
            Boolean(
              defaultSystemPkgManagerEnvelope &&
                spec.version &&
                caseInsensitiveEquals(
                  spec.name,
                  defaultSystemPkgManagerEnvelope.spec.name,
                ) &&
                caseInsensitiveEquals(
                  spec.version,
                  defaultSystemPkgManagerEnvelope.spec.version,
                ),
            ),
          target: 'done',
        },
        {
          actions: [
            log(
              ({context: {desiredPkgManager}}) =>
                `${desiredPkgManager}: not a system package manager`,
            ),
          ],
          guard: ({context: {spec}}): boolean => isKnownPkgManagerSpec(spec),
          target: 'matchPkgManager',
        },
        {
          actions: [
            log(
              ({context: {desiredPkgManager, spec}}) =>
                `${desiredPkgManager}: Matched partial system package manager: ${JSON.stringify(
                  spec,
                )}`,
            ),
          ],
          target: 'matchSystemPkgManager',
        },
      ],
    },
    matchPkgManager: {
      always: {target: 'done'},
      entry: [
        assign({
          envelope: ({
            context: {componentRegistry, envelope, plugins, spec},
            self,
          }) => {
            if (envelope) {
              return envelope;
            }
            assert.ok(
              spec.version !== SYSTEM,
              'Unexpected SYSTEM desired spec',
            );

            for (const plugin of plugins) {
              const {pkgManagers} = plugin;
              // package managers
              const matchingPkgManagers = filterMatchingPkgManagers(
                spec,
                pkgManagers,
              );
              self.system._logger(
                `Matching package managers: ${matchingPkgManagers
                  .map((pkgManager) => pkgManager.name)
                  .join(', ')}`,
              );

              // try package managers until one accepts the version
              for (const pkgManager of matchingPkgManagers) {
                const version = accepts(pkgManager, spec.version);

                const pkgManagerComponent = componentRegistry.get(pkgManager);
                if (!pkgManagerComponent) {
                  self.system._logger(
                    `No component found for pkgManager ${pkgManager.name}`,
                  );
                  continue;
                }
                self.system._logger(`Found version ${version}`);
                if (version) {
                  return {
                    id: pkgManagerComponent.id,
                    pkgManager,
                    plugin,
                    spec: PkgManagerSpec.create({
                      ...spec,
                      version,
                    }),
                  };
                }
              }
            }
          },
        }),
      ],
    },
    matchSystemPkgManager: {
      entry: [
        log(
          ({context: {desiredPkgManager}}) =>
            `Matching system package manager: "${desiredPkgManager}"`,
        ),
      ],
      invoke: {
        input: ({
          context: {
            componentRegistry,
            defaultSystemPkgManagerEnvelope,
            plugins,
            spec,
          },
        }): MatchSystemPkgManagerLogicInput => ({
          componentRegistry,
          defaultSystemPkgManagerEnvelope,
          plugins,
          spec,
        }),
        onDone: [
          {
            actions: [
              log(({event: {output}}) => {
                return `Matched system package manager: ${
                  output.envelope!.spec.label
                }`;
              }),
              {
                params: ({event: {output}}) => output,
                type: 'assignEnvelopes',
              },
            ],
            guard: ({
              event: {
                output: {envelope},
              },
            }): boolean => !!envelope,
            target: 'done',
          },
          {
            guard: ({context: {spec}}): boolean => isStaticPkgManagerSpec(spec),
            target: 'matchPkgManager',
          },
          {
            actions: [
              log(
                ({context: {desiredPkgManager}}) =>
                  `No system package manager found for desired spec ${desiredPkgManager}`,
              ),
            ],
            target: 'done',
          },
        ],
        onError: {
          actions: {
            params: ({event: {error}}): {error: unknown} => ({error}),
            type: 'assignError',
          },
          target: 'errored',
        },
        src: 'matchSystemPkgManager',
      },
    },
  },
});
