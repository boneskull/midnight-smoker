import {ERROR, FINAL, OK} from '#constants';
import {MachineError} from '#error/machine-error';
import {type ComponentRegistry} from '#plugin/component';
import {type PkgManagerEnvelope} from '#plugin/component-envelope';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type DesiredPkgManager} from '#schema/desired-pkg-manager';
import {type WorkspaceInfo} from '#schema/workspace-info';
import * as assert from '#util/assert';
import {fromUnknownError} from '#util/error-util';
import {type FileManager} from '#util/filemanager';
import {isEmpty, uniq} from 'lodash';
import {assign, enqueueActions, log, setup} from 'xstate';

import {guessPkgManagerLogic} from './actor/guess-pkg-manager';
import {type AbortEvent} from './event/abort';
import {
  ParsePkgManagerSpecMachine,
  type ParsePkgManagerSpecMachineInput,
} from './parse-pkg-manager-spec-machine';
import {
  type ActorOutputError,
  type ActorOutputOk,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
} from './util';

export interface PkgManagerLoaderMachineInput {
  componentRegistry: ComponentRegistry;
  desiredPkgManagers?: readonly DesiredPkgManager[];
  fileManager: FileManager;
  plugins: Readonly<PluginMetadata>[];
  workspaceInfo: WorkspaceInfo[];
}

export interface PkgManagerLoaderMachineContext
  extends PkgManagerLoaderMachineInput {
  aborted?: boolean;
  defaultSystemPkgManagerEnvelope?: PkgManagerEnvelope;
  desiredPkgManagers: DesiredPkgManager[];

  didGuess?: boolean;
  envelopeQueue: DesiredPkgManager[];
  envelopes: PkgManagerEnvelope[];

  error?: MachineError;
  unsupported: DesiredPkgManager[];
}

export type PkgManagerLoaderMachineEvent = AbortEvent;

export type PkgManagerLoaderMachineOutputOk = ActorOutputOk<{
  desiredPkgManagers: DesiredPkgManager[];
  envelopes: PkgManagerEnvelope[];
  unsupported: DesiredPkgManager[];
}>;

export type PkgManagerLoaderMachineOutputError = ActorOutputError<
  MachineError,
  {aborted: boolean}
>;

export type PkgManagerLoaderMachineOutput =
  | PkgManagerLoaderMachineOutputError
  | PkgManagerLoaderMachineOutputOk;

/**
 * @internal
 */
export const PkgManagerLoaderMachine = setup({
  actions: {
    abort: enqueueActions(({enqueue}, {reason}: {reason?: unknown} = {}) => {
      enqueue.raise({
        reason: fromUnknownError(reason),
        type: 'ABORT',
      });
    }),
    aborted: assign({aborted: true}),
    assignError: assign({
      error: ({context, self}, {error: err}: {error: unknown}) => {
        const error = fromUnknownError(err);
        if (context.error) {
          // this is fairly rare. afaict it only happens
          // when both the teardown and pruneTempDir actors fail
          return context.error.cloneWith(error);
        }

        return new MachineError(
          `Package manager loader encountered an error`,
          error,
          self.id,
        );
      },
    }),
    destroyAllChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      for (const child of Object.keys(snapshot.children)) {
        enqueue.stopChild(child);
      }
    }),
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),
  },
  actors: {
    guessPkgManager: guessPkgManagerLogic,
    ParsePkgManagerSpecMachine,
  },
  types: {
    context: {} as PkgManagerLoaderMachineContext,
    events: {} as PkgManagerLoaderMachineEvent,
    input: {} as PkgManagerLoaderMachineInput,
    output: {} as PkgManagerLoaderMachineOutput,
  },
}).createMachine({
  context: ({
    input: {desiredPkgManagers = [], ...input},
  }): PkgManagerLoaderMachineContext => {
    desiredPkgManagers = uniq(
      desiredPkgManagers.map((desiredPkgManager) => desiredPkgManager.trim()),
    );
    return {
      ...input,
      desiredPkgManagers: [...desiredPkgManagers],
      envelopeQueue: [...desiredPkgManagers],
      envelopes: [],
      unsupported: [],
    };
  },
  entry: [INIT_ACTION],
  initial: 'choosingStrategy',
  on: {
    ABORT: {
      actions: [log('aborting!'), 'destroyAllChildren', 'aborted'],
      target: '.errored',
    },
  },
  output: ({
    context: {
      aborted = false,
      desiredPkgManagers,
      envelopes,
      error,
      unsupported,
    },
    self: {id: actorId},
  }): PkgManagerLoaderMachineOutput =>
    error
      ? {aborted, actorId, error, type: ERROR}
      : {actorId, desiredPkgManagers, envelopes, type: OK, unsupported},
  states: {
    choosingStrategy: {
      always: [
        {
          actions: [log('No desired package managers specified, guessing...')],
          guard: ({context: {desiredPkgManagers}}) =>
            isEmpty(desiredPkgManagers),
          target: 'guess',
        },
        {
          actions: [
            log(
              ({context: {desiredPkgManagers}}) =>
                `Trying to match desired pkg managers: ${desiredPkgManagers.join(
                  ', ',
                )}`,
            ),
          ],
          target: 'createEnvelopes',
        },
      ],
    },
    createEnvelopes: {
      initial: 'parsingSpecs',
      onDone: {
        target: 'done',
      },
      states: {
        done: {
          type: FINAL,
        },
        parsingSpecs: {
          entry: [
            log(
              ({context: {desiredPkgManagers}}) =>
                `Parsing ${desiredPkgManagers.length} desired pkg manager(s)`,
            ),
          ],
          initial: 'parsePkgManagerSpec',
          onDone: {
            target: 'done',
          },
          states: {
            done: {
              type: FINAL,
            },
            nextSpec: {
              always: [
                {
                  guard: ({context: {desiredPkgManagers, envelopeQueue}}) =>
                    !isEmpty(desiredPkgManagers) && isEmpty(envelopeQueue),
                  target: 'done',
                },
                {
                  reenter: true,
                  target: 'parsePkgManagerSpec',
                },
              ],
            },
            parsePkgManagerSpec: {
              entry: [
                log(
                  ({context: {envelopeQueue}}) =>
                    `Parsing desired pkg manager: "${envelopeQueue[0]}"`,
                ),
              ],
              invoke: {
                input: ({
                  context: {
                    componentRegistry,
                    defaultSystemPkgManagerEnvelope,
                    didGuess,
                    envelopeQueue,
                    plugins,
                  },
                }): ParsePkgManagerSpecMachineInput => ({
                  componentRegistry,
                  defaultSystemPkgManagerEnvelope,
                  desiredPkgManager: envelopeQueue[0]!,
                  didGuess,
                  plugins,
                }),
                onDone: [
                  {
                    actions: [
                      assign({
                        defaultSystemPkgManagerEnvelope: ({
                          context: {defaultSystemPkgManagerEnvelope},
                          event: {output},
                        }) =>
                          defaultSystemPkgManagerEnvelope ??
                          output.defaultSystemPkgManagerEnvelope,
                        envelopeQueue: ({context: {envelopeQueue}}) => {
                          const [_head, ...tail] = envelopeQueue;
                          return tail;
                        },
                        envelopes: ({
                          context: {envelopes},
                          event: {output},
                        }) => {
                          assert.ok(output.type === OK);
                          return [...envelopes, output.envelope!];
                        },
                      }),
                    ],
                    guard: ({event: {output}}) =>
                      !!(output.type === OK && output.envelope),
                    target: 'nextSpec',
                  },
                  {
                    actions: [
                      assign({
                        defaultSystemPkgManagerEnvelope: ({
                          context: {defaultSystemPkgManagerEnvelope},
                          event: {output},
                        }) =>
                          defaultSystemPkgManagerEnvelope ??
                          output.defaultSystemPkgManagerEnvelope,
                        envelopeQueue: ({context: {envelopeQueue}}) => {
                          const [_head, ...tail] = envelopeQueue;
                          return tail;
                        },
                        unsupported: ({
                          context: {unsupported},
                          event: {output},
                        }) => {
                          assert.ok(output.type === OK);
                          return [...unsupported, output.desiredPkgManager];
                        },
                      }),
                    ],
                    guard: ({event: {output}}) =>
                      !!(output.type === OK && !output.envelope),
                    target: 'nextSpec',
                  },
                  {
                    actions: [
                      assign({
                        defaultSystemPkgManagerEnvelope: ({
                          context: {defaultSystemPkgManagerEnvelope},
                          event: {output},
                        }) =>
                          defaultSystemPkgManagerEnvelope ??
                          output.defaultSystemPkgManagerEnvelope,
                        envelopeQueue: ({context: {envelopeQueue}}) => {
                          const [_head, ...tail] = envelopeQueue;
                          return tail;
                        },
                      }),
                      {
                        params: ({event: {output}}) => {
                          assert.ok(output.type === ERROR);
                          return {
                            error: output.error,
                          };
                        },
                        type: 'assignError',
                      },
                      {
                        params: ({event: {output}}) => {
                          assert.ok(output.type === ERROR);
                          return {reason: output.error};
                        },
                        type: 'abort',
                      },
                    ],
                    guard: ({event: {output}}) => output.type === ERROR,
                  },
                ],
                onError: {
                  actions: [
                    {
                      params: ({event: {error}}) => ({error}),
                      type: 'assignError',
                    },
                    {
                      params: ({event: {error}}) => ({reason: error}),
                      type: 'abort',
                    },
                  ],
                },
                src: 'ParsePkgManagerSpecMachine',
              },
            },
          },
        },
      },
    },
    done: {
      type: FINAL,
    },
    errored: {
      type: FINAL,
    },
    guess: {
      invoke: {
        input: ({context: {fileManager, plugins, workspaceInfo}}) => ({
          fileManager,
          plugins,
          workspaceInfo,
        }),
        onDone: {
          actions: [
            assign({
              desiredPkgManagers: ({event: {output: desiredPkgManager}}) => [
                desiredPkgManager,
              ],
              didGuess: true,
              envelopeQueue: ({event: {output: desiredPkgManager}}) => [
                desiredPkgManager,
              ],
            }),
            log(
              ({event: {output: desiredPkgManager}}) =>
                `Guessed "${desiredPkgManager}"`,
            ),
          ],
          target: 'createEnvelopes',
        },
        onError: {
          actions: [
            {params: ({event: {error}}) => ({error}), type: 'assignError'},
            {params: ({event: {error}}) => ({reason: error}), type: 'abort'},
          ],
        },
        src: 'guessPkgManager',
      },
    },
  },
});
