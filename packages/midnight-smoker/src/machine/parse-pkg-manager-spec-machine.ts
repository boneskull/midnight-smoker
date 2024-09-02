import {ERROR, FINAL, OK, SYSTEM} from '#constants';
import {MachineError} from '#error/machine-error';
import {
  accepts,
  filterMatchingPkgManagers,
} from '#pkg-manager/pkg-manager-loader';
import {PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type ComponentRegistry} from '#plugin/component';
import {type PkgManagerEnvelope} from '#plugin/component-envelope';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {
  type DesiredPkgManager,
  parseDesiredPkgManagerSpec,
} from '#schema/desired-pkg-manager';
import {
  isKnownStaticPkgManagerSpec,
  isStaticPkgManagerSpec,
  type StaticPkgManagerSpec,
} from '#schema/static-pkg-manager-spec';
import * as assert from '#util/assert';
import {fromUnknownError} from '#util/error-util';
import {caseInsensitiveEquals} from '#util/util';
import {assign, log, setup} from 'xstate';

import {
  matchSystemPkgManagerLogic,
  type MatchSystemPkgManagerLogicInput,
} from './actor/match-system-pkg-manager';
import {
  type ActorOutputError,
  type ActorOutputOk,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
} from './util';

export interface ParsePkgManagerSpecMachineInput {
  componentRegistry: ComponentRegistry;
  defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
  desiredPkgManager: DesiredPkgManager;
  didGuess?: boolean;

  plugins: Readonly<PluginMetadata>[];
}

export interface ParsePkgManagerSpecMachineContext
  extends ParsePkgManagerSpecMachineInput {
  envelope?: PkgManagerEnvelope;
  error?: MachineError;
  spec: StaticPkgManagerSpec;
}

export type ParsePkgManagerSpecMachineOutputOk = ActorOutputOk<{
  defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
  desiredPkgManager: DesiredPkgManager;
  envelope?: PkgManagerEnvelope;
}>;

export type ParsePkgManagerSpecMachineOutputError = ActorOutputError<
  MachineError,
  {
    defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
    desiredPkgManager: DesiredPkgManager;
  }
>;

export type ParsePkgManagerSpecMachineOutput =
  | ParsePkgManagerSpecMachineOutputError
  | ParsePkgManagerSpecMachineOutputOk;

/**
 * @internal
 */
export const ParsePkgManagerSpecMachine = setup({
  actions: {
    assignError: assign({
      error: ({context, self}, {error: err}: {error: unknown}) => {
        const error = fromUnknownError(err);
        if (context.error) {
          // this is fairly rare. afaict it only happens
          // when both the teardown and pruneTempDir actors fail
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
          guard: ({context: {spec}}): boolean =>
            isKnownStaticPkgManagerSpec(spec),
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
              assign({
                defaultSystemPkgManagerEnvelope: ({
                  context: {defaultSystemPkgManagerEnvelope},
                  event: {output},
                }): PkgManagerEnvelope | undefined =>
                  defaultSystemPkgManagerEnvelope ??
                  output.defaultSystemPkgManagerEnvelope,
                envelope: ({
                  context: {envelope},
                  event: {output},
                }): PkgManagerEnvelope => envelope ?? output.envelope!,
              }),
            ],
            guard: ({
              event: {
                output: {envelope},
              },
            }): boolean => Boolean(envelope),
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
