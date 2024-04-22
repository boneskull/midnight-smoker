import {fromUnknownError} from '#error';
import {type CtrlComponentsEvent} from '#machine/controller';
import {
  LoadableComponents,
  ReifierMachine,
  type ReifierOutput,
} from '#machine/reifier';
import {
  assertMachineOutputNotOk,
  assertMachineOutputOk,
  isMachineOutputNotOk,
  isMachineOutputOk,
  makeId,
  monkeypatchActorLogger,
  type MachineOutput,
  type MachineOutputError,
  type MachineOutputOk,
} from '#machine/util';
import {type SmokerOptions} from '#options';
import {type PkgManager} from '#pkg-manager';
import {type PluginRegistry} from '#plugin';
import {type SomeReporter} from '#reporter';
import {type Executor, type SomeRule} from '#schema';
import {type FileManager} from '#util';
import {
  assign,
  enqueueActions,
  fromPromise,
  log,
  not,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';

export interface PluginLoaderMachineInput {
  pluginRegistry: PluginRegistry;
  fileManager: FileManager;
  systemExecutor: Executor;
  defaultExecutor: Executor;
  smokerOptions: SmokerOptions;
  parentRef: AnyActorRef;
}

export type PluginLoaderMachineOutputOk = MachineOutputOk;

export type PluginLoaderMachineOutputError = MachineOutputError;

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
 * Executes the {@link PkgManager.teardown} method on all package managers.
 */
const teardownPkgManagers = fromPromise<void, PkgManager[]>(
  async ({input: pkgManagers}): Promise<void> => {
    await Promise.all(pkgManagers.map((pkgManager) => pkgManager.teardown()));
  },
);

/**
 * Executes the {@link PkgManager.setup} method on all package managers.
 */
const setupPkgManagers = fromPromise<void, PkgManager[]>(
  async ({input: pkgManagers}): Promise<void> => {
    await Promise.all(pkgManagers.map((pkgManager) => pkgManager.setup()));
  },
);

/**
 * Executes the {@link Reporter.setup} method on all reporters.
 */
const setupReporters = fromPromise<void, SomeReporter[]>(
  async ({input: reporters}): Promise<void> => {
    await Promise.all(reporters.map((reporter) => reporter.setup()));
  },
);

/**
 * Executes the {@link Reporter.teardown} method on all reporters.
 */
const teardownReporters = fromPromise<void, SomeReporter[]>(
  async ({input: reporters}): Promise<void> => {
    await Promise.all(reporters.map((reporter) => reporter.teardown()));
  },
);

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
          smokerOptions: smokerOpts,
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
                  cwd: smokerOpts.cwd,
                  systemExecutor,
                  defaultExecutor,
                },
                smokerOpts,
                component: LoadableComponents.All,
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
    hasError: ({context: {error}}) => Boolean(error),
    notHasError: not('hasError'),
    isMachineOutputOk: (_, output: MachineOutput) => isMachineOutputOk(output),
    isMachineOutputNotOk: (_, output: MachineOutput) =>
      isMachineOutputNotOk(output),
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QAUA2BXKBLAdgGQHsBDCMAJwFkiBjAC1zADpViJcoBiAD1gBcjeTCARxMavAmUYAlMFgBmWclToNGAKgDaABgC6iUAAcCsLLywiDILogBsAJgA0IAJ6IArAE4AjI2+eHAGZA+08AFjDA7wB2AF9Y5zRMXEISZRp6UWZWdm4+ASERMWoJKVkFJUoMtS1vfSQQY1NzSwabBDD7AA5GWzDtW21orqj7KLDnNwR7MNtGd0DPJfdohy6uz0DbeMSMbHxWdNUs2DBedEMOYRP+QUYk-dTSKuOmU-PDHXqjEzMLHCs7W82n6jE8XUitlsSy69m0nmik0QnlCjAh0XstkCQ1s3gh9h2IAeKUOL0ybzOFyuRUY+TuxIOaTJaneF00dSsTT+rVAQJB2jBEK20PBcIRSIQ3kxvjC4OxCIi3S6hIZTyO5NplMMjDIYGMZEEZFgmo+sn1htg1KyuAAbgQANZMVWklQa1na3Xm8jG91myQWhC2gjUAT-L5fTm-FoAtqIQLRXwDGbhBPabH2bwS4EJ+baLoY4JjQLuZUJIl7ElM10srU6vX+70mi5+g3ejjkMiSRiGVACeSSAC29wrjOe1ZOtc9DaNTcMLYDQZD0fDekjzX+gLjOaTsrCqfTmdcyPcvi67hmDmiQ28fTiZedVeqE4+3ftUCoOCIMBn7uQb4-X5ttcTBBo6w7JKO6o1i+hj-kQn7fj6Wp-u+8GAUagY4HaS5hnoEYNFy0abggiyBGCSwIkMKwYl0thZpEPQzFEaaeNowKse4KojmqzLPhcr6oQhja-nBQlGu2ZCdlIPZ9oO4GPC6T4UjBonoUhHwoQBiGYdhoYiCu3yNFGG6xiRmzkUsV7RNR3R0UekpRD0Ja2EK3RhBs0RhFxEE8eOTC6iQLgcAAKgAogAgtIAAiADyADqABy+E-OuPLWIgMR4n4-S2F4uJ9LY0SIvZATRH4WzBJsGzots97cYpryMIIRBkMIADuOBWm8txOvVj6Nc1rUEB1yVGalMa8ogcLRJ4jCjOeIIRO5h5TJs7i5vmYzuCW3jOd5Cn9Rqg3tZ1wG0j18mVmOSlNWALUneyhmESZk3TEMs3zXCS3LVmbHrfi2grLRWKrJ48RljgBCkPADQPtdrxrtyE3pQgAC09jFVMGJoi5SaBLC2Jpt4+1XVBWQsCQ7CI0RpmdBK9gzHNuM7WEJ4bLlJOQbxykXNTL0oxmEouWVZ4zFesJeJ5nO+Td7p1l6Rp82l7TQhKXT+Gi56zIVULuNCXl1T5DVupO9atj+Wrzt6SvI0CMQSp4JbzN4pEOOCV5RNLxvQfxU7m8awE28RKxkWemzWf4ybeBMJXDM7izAi76zZl7h0+9qsGCWpQemar9neHiczOeigQROmqfwybKlZ4hs6aWhiE569BeYxlITrTMIw3vmfTFrVuxG2nfEZ6pteBwRxnK3YGvRKX8ZsXmAwrFmpcd+5oTXrlkQGwPB2V2oAUQFMKVI8R0cZoKDGO3rN7uQ7Ll+NZq8Zo7wScYbe9k0wx3Dcjz1T5KCEs1WJYjTGEaOnRwhqxzDEBY6xFh60KhXL+t17q-wElpa2E9xpnw8mCAY2JS4QNCDHKYwI0yP3cJ0BMes5R3l3qTbmqChodXltOGGJ8abNx8GRROgw0znnCBEX6uJehPyhOAma4xkFMI7JISATcBZbHWsMKU+UZqeVnlmMYZVdbaH0WMaOeYd7lkHvvLI49OH83aGMcEjAPYFxcnrWULkHYFzEYI8EiD1ilniEAA
   */
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
                  assertMachineOutputNotOk(output);
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
                  assertMachineOutputOk(output);
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
      type: 'parallel',
      description: 'Runs the "teardown" lifecycle for reified components',
      states: {
        pkgManagers: {
          initial: 'teardownPkgManagers',
          states: {
            teardownPkgManagers: {
              description:
                'Runs the "teardown" lifecycle for reified PkgManagers',
              entry: [log('tearing down pkg managers...')],
              invoke: {
                src: 'teardownPkgManagers',
                input: ({context: {pkgManagers = []}}) => pkgManagers,
                onError: {
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#PluginLoaderMachine.teardown.pkgManagers.done',
                },
                onDone: {
                  target: '#PluginLoaderMachine.teardown.pkgManagers.done',
                },
              },
            },
            done: {
              type: 'final',
            },
          },
        },
        reporters: {
          initial: 'teardownReporters',
          states: {
            teardownReporters: {
              description:
                'Runs the "teardown" lifecycle for reified Reporters',
              entry: [log('tearing down reporters...')],
              invoke: {
                src: 'teardownReporters',
                input: ({context: {reporters = []}}) => reporters,
                onDone: {
                  target: '#PluginLoaderMachine.teardown.reporters.done',
                },
                onError: {
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#PluginLoaderMachine.teardown.reporters.done',
                },
              },
            },
            done: {
              type: 'final',
            },
          },
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
