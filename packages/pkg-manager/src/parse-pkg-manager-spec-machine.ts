import {ERROR, FINAL, OK, SYSTEM} from 'midnight-smoker/constants';
import {
  type PkgManager,
  PkgManagerSpec,
} from 'midnight-smoker/defs/pkg-manager';
import {MachineError} from 'midnight-smoker/error';
import {
  type ActorOutputError,
  type ActorOutputOk,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
} from 'midnight-smoker/machine';
import {
  getRange,
  normalizeVersionAgainstPkgManager,
} from 'midnight-smoker/pkg-manager';
import {
  type ComponentRegistry,
  type PkgManagerEnvelope,
  type PluginMetadata,
} from 'midnight-smoker/plugin';
import {
  type DesiredPkgManager,
  parseDesiredPkgManagerSpec,
  type PartialStaticPkgManagerSpec,
  type StaticPkgManagerSpec,
} from 'midnight-smoker/schema';
import {
  assert,
  caseInsensitiveEquals,
  fromUnknownError,
  isKnownPkgManagerSpec,
  isStaticPkgManagerSpec,
} from 'midnight-smoker/util';
import {type SemVer} from 'semver';
import {assign, log, setup} from 'xstate';

import {
  matchSystemPkgManagerLogic,
  type MatchSystemPkgManagerLogicInput,
  type MatchSystemPkgManagerLogicOutput,
} from './match-system-pkg-manager';

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
 * @internal
 */
export const ParsePkgManagerSpecMachine = setup({
  actions: {
    /**
     * Assigns the result of {@link matchSystemPkgManagerLogic} to the context
     */
    assignEnvelopesFromSystem: assign({
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

    /**
     * Assigns the
     */
    maybeAssignEnvelope: assign({
      envelope: ({
        context: {componentRegistry, envelope, plugins, spec},
        self,
      }) => {
        if (envelope) {
          return envelope;
        }
        assert.ok(spec.version !== SYSTEM, 'Unexpected SYSTEM desired spec');

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
  },
  actors: {
    matchSystemPkgManager: matchSystemPkgManagerLogic,
  },
  guards: {
    /**
     * Returbns `true` if the output of {@link matchSystemPkgManagerLogic} has a
     * truthy {@link MatchSystemPkgManagerLogicOutput.envelope envelope field}.
     */
    hasEnvelope: (_, {envelope}: MatchSystemPkgManagerLogicOutput) =>
      !!envelope,

    /**
     * Returns `true` if a default system package manager was found and
     * {@link ParsePkgManagerSpecMachineContext.spec spec} matches it
     */
    isDefaultPkgManagerSpec: ({
      context: {defaultSystemPkgManagerEnvelope, spec},
    }): boolean =>
      !!defaultSystemPkgManagerEnvelope &&
      !!spec.version &&
      caseInsensitiveEquals(
        spec.name,
        defaultSystemPkgManagerEnvelope.spec.name,
      ) &&
      caseInsensitiveEquals(
        spec.version,
        defaultSystemPkgManagerEnvelope.spec.version,
      ),

    /**
     * Returns `true` if the pkg manager is one of the blessed ones
     */
    isKnownStaticPkgManagerSpec: ({context: {spec}}): boolean =>
      isKnownPkgManagerSpec(spec),

    /**
     * Returns `true` if the spec is a well-formed `StaticPkgManagerSpec`
     *
     * This should be checked _after_ we've checked if it matches the default
     * system pkg manager spec.
     */
    isStaticPkgManagerSpec: ({context: {spec}}): boolean =>
      isStaticPkgManagerSpec(spec),
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
        `Parsed desired pkg manager "${desiredPkgManager}" as spec: ${JSON.stringify(
          spec,
        )}`,
    ),
  ],
  initial: 'matchDefaultSystemPkgManager',

  /**
   * This machine can exit with an `undefined`
   * {@link ParsePkgManagerSpecMachineOutput.envelope envelope} field, which
   * means the desired package manager could not be matched. It is the
   * responsibility of the receiver of this output to handle this case (which is
   * probably an error).
   */
  output: ({
    context: {
      defaultSystemPkgManagerEnvelope,
      desiredPkgManager,
      envelope,
      error,
    },
    self: {id: actorId},
  }): ParsePkgManagerSpecMachineOutput =>
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
      description: 'Final state if an error occurs',
      type: FINAL,
    },
    matchDefaultSystemPkgManager: {
      always: [
        {
          actions: [
            log(
              ({context: {desiredPkgManager}}) =>
                `"${desiredPkgManager}": Matched default system package manager`,
            ),
          ],
          guard: 'isDefaultPkgManagerSpec',
          target: 'done',
        },
        {
          actions: [
            log(
              ({context: {desiredPkgManager}}) =>
                `"${desiredPkgManager}": matching a non-system package manager`,
            ),
          ],
          guard: 'isKnownStaticPkgManagerSpec',
          target: 'matchPkgManager',
        },
        {
          actions: [
            log(
              ({context: {desiredPkgManager}}) =>
                `"${desiredPkgManager}": matching a system package manager`,
            ),
          ],
          target: 'matchSystemPkgManager',
        },
      ],
      description:
        'Initial state which determines how to match against the spec',
    },
    matchPkgManager: {
      always: {target: 'done'},
      description:
        'Assigns the envelope from a non-system package manager if a plugin supports it. Purely for logical separation',
      entry: ['maybeAssignEnvelope'],
    },
    matchSystemPkgManager: {
      description:
        'We want to match against a system package manager, but either there is no default system package manager or it does not match. Logic is handled by separate actor',
      entry: [
        log(
          ({context: {desiredPkgManager}}) =>
            `Attempting to match system package manager: "${desiredPkgManager}"`,
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
              log(
                ({event: {output}}) =>
                  `Matched system package manager: ${
                    output.envelope!.spec.label
                  }`,
              ),
              {
                params: ({event: {output}}) => output,
                type: 'assignEnvelopesFromSystem',
              },
            ],
            guard: {
              params: ({event: {output}}) => output,
              type: 'hasEnvelope',
            },
            target: 'done',
          },
          // {
          //   actions: [
          //     log(
          //       ({context: {desiredPkgManager}}) =>
          //         `"${desiredPkgManager}": Attempting to match non-system package manager`,
          //     ),
          //   ],
          //   guard: 'isStaticPkgManagerSpec',
          //   target: 'matchPkgManager',
          // },
          {
            actions: [
              log(
                ({context: {desiredPkgManager}}) =>
                  `"${desiredPkgManager}": No system package manager found`,
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
