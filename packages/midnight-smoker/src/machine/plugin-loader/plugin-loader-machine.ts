import {fromUnknownError} from '#error';
import {type CtrlComponentsEvent} from '#machine/controller';
import {
  LoadableComponents,
  ReifierMachine,
  type ReifierOutput,
} from '#machine/reifier';
import {
  assertActorOutputNotOk,
  assertActorOutputOk,
  isActorOutputNotOk,
  isActorOutputOk,
  makeId,
  monkeypatchActorLogger,
  type ActorOutput,
  type ActorOutputError,
  type ActorOutputOk,
} from '#machine/util';
import {type SmokerOptions} from '#options';
import {type PkgManager} from '#pkg-manager';
import {type PluginRegistry} from '#plugin';
import {type SomeReporter} from '#reporter';
import {type Executor, type SomeRule, type WorkspaceInfo} from '#schema';
import {type FileManager} from '#util';
import {isEmpty} from 'lodash';
import {
  assign,
  enqueueActions,
  log,
  not,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {
  pruneTempDirs,
  setupPkgManagers,
  setupReporters,
  teardownPkgManagers,
  teardownReporters,
} from './plugin-loader-actors';

export interface PluginLoaderMachineInput {
  pluginRegistry: PluginRegistry;
  fileManager: FileManager;
  systemExecutor: Executor;
  defaultExecutor: Executor;
  smokerOptions: SmokerOptions;
  parentRef: AnyActorRef;
  workspaceInfo: WorkspaceInfo[];
}

export type PluginLoaderMachineOutputOk = ActorOutputOk;

export type PluginLoaderMachineOutputError = ActorOutputError;

export type PluginLoaderMachineOutput =
  | PluginLoaderMachineOutputOk
  | PluginLoaderMachineOutputError;

export interface PluginLoaderMachineContext extends PluginLoaderMachineInput {
  error?: Error;
  reifierMachineRefs: Record<string, ActorRefFrom<typeof ReifierMachine>>;
  pkgManagers?: PkgManager[];
  reporters?: SomeReporter[];
  rules?: SomeRule[];
}

export interface SendComponentsParams {
  pkgManagers?: PkgManager[];
  reporters?: SomeReporter[];
  rules?: SomeRule[];
}

export interface PluginLoaderReifierDoneEvent {
  output: ReifierOutput;
  type: 'xstate.done.actor.ReifierMachine.*';
}

export interface PluginLoaderTeardownEvent {
  type: 'TEARDOWN';
}

export type PluginLoaderEvents =
  | PluginLoaderReifierDoneEvent
  | PluginLoaderTeardownEvent;

export interface AssignReifiedComponentsParams {
  pkgManagers: PkgManager[];
  reporters: SomeReporter[];
  rules: SomeRule[];
}

/**
 * This is mainly here to make `ControlMachine` smaller.
 *
 * When loading, `ControlMachine` will spawn one of these. It reifies (via _n_
 * {@link ReifierMachine ReifierMachines}) all package managers, enabled rules,
 * and enabled reporters. It will then emit a {@link CtrlComponentsEvent} back to
 * `ControlMachine` with the reified components.
 *
 * It stays alive until `ControlMachine` sends a `TEARDOWN` event, which is
 * relayed to the components.
 *
 * TODO: Currently it only tears down the package managers; it should also tear
 * down reporters. Rules do not not have a lifecycle
 */
export const PluginLoaderMachine = setup({
  types: {
    input: {} as PluginLoaderMachineInput,
    context: {} as PluginLoaderMachineContext,
    events: {} as PluginLoaderEvents,
    output: {} as PluginLoaderMachineOutput,
  },
  actors: {
    ReifierMachine,
    setupPkgManagers,
    teardownPkgManagers,
    setupReporters,
    teardownReporters,
    pruneTempDirs,
  },
  actions: {
    /**
     * Assigns reified components to the context for setup/teardown lifecycle
     * events.
     *
     * This action intentionally omits rules, since they do not have a
     * lifecycle.
     */
    assignReifiedComponents: assign({
      pkgManagers: (
        {context: {pkgManagers = []}},
        {pkgManagers: newPkgManagers}: AssignReifiedComponentsParams,
      ) => [...pkgManagers, ...newPkgManagers],
      reporters: (
        {context: {reporters = []}},
        {reporters: newReporters}: AssignReifiedComponentsParams,
      ) => [...reporters, ...newReporters],
      rules: (
        {context: {rules = []}},
        {rules: newRules}: AssignReifiedComponentsParams,
      ) => [...rules, ...newRules],
    }),

    /**
     * Spawns a {@link ReifierMachine} for each plugin
     */
    spawnReifiers: assign({
      reifierMachineRefs: ({
        context: {
          pluginRegistry,
          fileManager: fm,
          systemExecutor,
          defaultExecutor,
          smokerOptions,
          workspaceInfo,
        },
        spawn,
      }) =>
        Object.fromEntries(
          pluginRegistry.plugins.map((plugin) => {
            const id = `ReifierMachine.${makeId()}`;
            const actor = spawn('ReifierMachine', {
              id,
              input: {
                plugin,
                pluginRegistry,
                pkgManager: {
                  fm,
                  cwd: smokerOptions.cwd,
                  systemExecutor,
                  defaultExecutor,
                },
                smokerOptions,
                component: LoadableComponents.All,
                workspaceInfo,
              },
            });

            return [id, monkeypatchActorLogger(actor, id)];
          }),
        ),
    }),

    /**
     * Stops a given {@link ReifierMachine}
     */
    stopReifier: enqueueActions(
      ({enqueue, context: {reifierMachineRefs}}, id: string) => {
        enqueue.stopChild(id);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = reifierMachineRefs;
        enqueue.assign({
          reifierMachineRefs: rest,
        });
      },
    ),

    /**
     * Assigns an error to the context
     */
    assignError: assign({
      // TODO: aggregate for multiple
      error: ({context}, {error}: {error?: unknown}): Error | undefined =>
        error ? fromUnknownError(error) : context.error,
    }),

    /**
     * Sends component data to the parent actor
     */
    sendComponents: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self},
        {pkgManagers = [], reporters = [], rules = []}: SendComponentsParams,
      ): CtrlComponentsEvent => ({
        type: 'COMPONENTS',
        pkgManagers,
        reporters,
        rules,
        sender: self.id,
      }),
    ),
  },
  guards: {
    shouldPruneTempDirs: ({
      context: {
        pkgManagers,
        smokerOptions: {linger},
      },
    }) => !isEmpty(pkgManagers) && !linger,
    hasError: ({context: {error}}) => Boolean(error),
    notHasError: not('hasError'),
    isMachineOutputOk: (_, output: ActorOutput) => isActorOutputOk(output),
    isMachineOutputNotOk: (_, output: ActorOutput) =>
      isActorOutputNotOk(output),
  },
}).createMachine({
  context: ({input}) => ({...input, reifierMachineRefs: {}}),
  initial: 'loading',
  id: 'PluginLoaderMachine',
  description:
    'This gets reified components from each plugin and hands them to the parent machine',
  states: {
    loading: {
      description: 'Spawns a reifier for each plugin and waits for completion',
      entry: [{type: 'spawnReifiers'}],
      on: {
        'xstate.done.actor.ReifierMachine.*': [
          {
            guard: {
              type: 'isMachineOutputNotOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              {
                type: 'assignError',
                params: ({event: {output}}) => {
                  assertActorOutputNotOk(output);
                  return {error: output.error};
                },
              },
              {
                type: 'stopReifier',
                params: ({event: {output}}) => output.id,
              },
            ],
            target: 'done',
          },
          {
            guard: {
              type: 'isMachineOutputOk',
              params: ({event: {output}}) => output,
            },
            actions: [
              {
                type: 'assignReifiedComponents',
                params: ({event: {output}}) => {
                  assertActorOutputOk(output);
                  return output;
                },
              },
              {
                type: 'stopReifier',
                params: ({event: {output}}) => output.id,
              },
            ],
            target: '#PluginLoaderMachine.setup',
          },
        ],
      },
    },
    setup: {
      description: 'Runs the "setup" lifecycle event for reified components',
      type: 'parallel',
      states: {
        reporters: {
          description: 'Runs the "setup" lifecyle event for reified Reporters',
          initial: 'setupReporters',
          states: {
            setupReporters: {
              description: 'Executes the setupReporters actor',
              entry: [log('lifecycle: setup reporters')],
              invoke: {
                src: 'setupReporters',
                input: ({context: {reporters = []}}) => reporters,
                onDone: {
                  actions: [log('lifecycle: setup reporters done')],
                  target: '#PluginLoaderMachine.setup.reporters.done',
                },
                onError: {
                  actions: [
                    log(({event: {error}}) => error),
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#PluginLoaderMachine.setup.reporters.done',
                },
              },
            },
            done: {
              description: 'Reporters done setting up (with or without error)',
              type: 'final',
            },
          },
        },
        pkgManagers: {
          initial: 'setupPkgManagers',
          description:
            'Runs the "setup" lifecyle event for reified PkgManagers',
          states: {
            setupPkgManagers: {
              description: 'Executes the setupPkgManagers actor',
              entry: [log('lifecycle: setup pkg managers')],
              invoke: {
                src: 'setupPkgManagers',
                input: ({context: {pkgManagers = []}}) => pkgManagers,
                onDone: {
                  actions: [log('lifecycle: setup pkg managers done')],
                  target: '#PluginLoaderMachine.setup.pkgManagers.done',
                },
                onError: {
                  actions: [
                    log(({event: {error}}) => error),
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#PluginLoaderMachine.setup.pkgManagers.done',
                },
              },
            },
            done: {
              description:
                'PkgManagers done setting up (with or without error)',
              type: 'final',
            },
          },
        },
      },
      onDone: [
        {
          description:
            'Setup lifecycle completed successfully; send all components to parent machine',
          guard: {type: 'notHasError'},
          actions: [
            log(
              ({context: {rules = [], pkgManagers = [], reporters = []}}) =>
                `sending ${rules.length} rules, ${pkgManagers.length} pkg managers, and ${reporters.length} reporters`,
            ),
            {
              type: 'sendComponents',
              params: ({context: {rules, pkgManagers, reporters}}) => {
                return {rules, pkgManagers, reporters};
              },
            },
          ],
          target: '#PluginLoaderMachine.ready',
        },
        {
          description: 'Setup lifecycle completed with error',
          guard: {type: 'hasError'},
          target: '#PluginLoaderMachine.errored',
        },
      ],
    },
    ready: {
      description: 'Idles until a TEARDOWN event is received',
      on: {
        TEARDOWN: {
          actions: [log('TEARDOWN received')],
          target: 'teardown',
        },
      },
    },
    teardown: {
      description: 'Runs the "teardown" lifecycle for reified components',
      initial: 'teardownPkgManagers',
      states: {
        teardownPkgManagers: {
          description: 'Runs the "teardown" lifecycle for reified PkgManagers',
          entry: [log('tearing down pkg managers...')],
          invoke: {
            src: 'teardownPkgManagers',
            input: ({context: {pkgManagers = []}}) => pkgManagers,
            onError: [
              {
                guard: {type: 'shouldPruneTempDirs'},
                actions: [
                  {
                    type: 'assignError',
                    params: ({event: {error}}) => ({error}),
                  },
                ],
                target: '#PluginLoaderMachine.teardown.pruningTempDirs',
              },
              {
                actions: [
                  {
                    type: 'assignError',
                    params: ({event: {error}}) => ({error}),
                  },
                ],
                target: '#PluginLoaderMachine.teardown.teardownReporters',
              },
            ],
            onDone: [
              {
                guard: {type: 'shouldPruneTempDirs'},
                target: '#PluginLoaderMachine.teardown.pruningTempDirs',
              },
              {
                target: '#PluginLoaderMachine.teardown.teardownReporters',
              },
            ],
          },
        },
        pruningTempDirs: {
          entry: [log('pruning temp dirs...')],
          invoke: {
            src: 'pruneTempDirs',
            input: ({context: {pkgManagers = [], fileManager}}) => ({
              pkgManagers,
              fileManager,
            }),
            onDone: {
              target: '#PluginLoaderMachine.teardown.teardownReporters',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => ({error}),
                },
              ],
              target: '#PluginLoaderMachine.teardown.teardownReporters',
            },
          },
        },
        teardownReporters: {
          description: 'Runs the "teardown" lifecycle for reified Reporters',
          entry: [log('tearing down reporters...')],
          invoke: {
            src: 'teardownReporters',
            input: ({context: {reporters = []}}) => reporters,
            onDone: {
              target: '#PluginLoaderMachine.teardown.teardownComplete',
            },
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => ({error}),
                },
              ],
              target: '#PluginLoaderMachine.teardown.teardownComplete',
            },
          },
        },
        teardownComplete: {
          type: 'final',
        },
      },
      onDone: [
        {
          description: 'Teardown lifecycle completed successfully',
          guard: {type: 'notHasError'},
          target: '#PluginLoaderMachine.done',
        },
        {
          description: 'Setup teardown completed with error',
          guard: {type: 'hasError'},
          target: '#PluginLoaderMachine.errored',
        },
      ],
    },
    errored: {
      description: 'An error occurred',
      type: 'final',
    },
    done: {
      description: 'Complete without error',
      type: 'final',
    },
  },
  output: ({self, context: {error}}) =>
    error
      ? {
          type: 'ERROR',
          error,
          id: self.id,
        }
      : {
          type: 'OK',
          id: self.id,
        },
});
