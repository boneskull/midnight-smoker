import {fromUnknownError} from '#error';
import {ReporterListenerEventMap, type ReporterListeners} from '#reporter';
import {type SomeReporter} from '#reporter/reporter';
import {isFunction, pickBy} from 'lodash';
import {
  assign,
  fromPromise,
  log,
  not,
  setup,
  type ActorRef,
  type Subscription,
} from 'xstate';
import {type CtrlEmitted} from './controller/control-machine-events';
import {type MachineOutputError, type MachineOutputOk} from './machine-util';

export interface RMInput {
  reporter: SomeReporter;
  emitter: ActorRef<any, any, CtrlEmitted>;
}

export interface RMContext extends RMInput {
  listeners: Partial<ReporterListeners>;
  subscriptions: Subscription[];
  queue: CtrlEmitted[];
  error?: Error;
}

export type RMOutputOk = MachineOutputOk;
export type RMOutputError = MachineOutputError;

export type RMOutput = RMOutputOk | RMOutputError;

export const setupReporter = fromPromise<void, SomeReporter>(
  async ({input: reporter}): Promise<void> => {
    await reporter.setup();
  },
);

export const teardownReporter = fromPromise<void, SomeReporter>(
  async ({input: reporter}): Promise<void> => {
    await reporter.teardown();
  },
);

export const drainQueue = fromPromise<
  void,
  {
    queue: CtrlEmitted[];
    listeners: Partial<ReporterListeners>;
    reporter: SomeReporter;
  }
>(async ({input: {reporter, queue}}) => {
  while (queue.length) {
    const event = queue.shift()!;
    const {type, ...rest} = event;
    // @ts-expect-error fix later
    await reporter.invokeListener({...rest, event: type});
  }
});

export interface RMCtrlEvent {
  type: 'EVENT';
  event: CtrlEmitted;
}

export interface RMHaltEvent {
  type: 'HALT';
}

export type RMEvents = RMCtrlEvent | RMHaltEvent;

export const ReporterMachine = setup({
  types: {
    context: {} as RMContext,
    input: {} as RMInput,
    events: {} as RMEvents,
    output: {} as RMOutput,
  },
  actors: {
    teardownReporter,
    setupReporter,
    drainQueue,
  },
  guards: {
    hasEvents: ({context: {queue}}) => Boolean(queue.length),
    isQueueEmpty: not('hasEvents'),
  },
  actions: {
    assignError: assign({
      error: (_, {error}: {error: unknown}) => fromUnknownError(error),
    }),
    unsubscribe: assign({
      subscriptions: ({context: {subscriptions}}) => {
        subscriptions.forEach((sub) => {
          sub.unsubscribe();
        });
        return [];
      },
    }),
    enqueue: assign({
      queue: ({context: {queue}}, {event}: {event: CtrlEmitted}) => [
        ...queue,
        event,
      ],
    }),
    createListeners: assign({
      listeners: ({context: {reporter}}) => {
        const listeners = pickBy(
          reporter.def,
          (val, key) => key in ReporterListenerEventMap && isFunction(val),
        ) as Partial<ReporterListeners>;

        return listeners;
      },
    }),
    destroyListeners: assign({
      listeners: {},
    }),
    subscribe: assign({
      subscriptions: ({self, context: {emitter, listeners}}) => {
        const listenerNames = Object.keys(listeners);
        return listenerNames.map((methodName) => {
          const eventName =
            ReporterListenerEventMap[
              methodName as keyof typeof ReporterListenerEventMap
            ];

          // @ts-expect-error not done yet
          return emitter.on(eventName, (event) => {
            self.send({type: 'EVENT', event});
          });
        });
      },
    }),
  },
}).createMachine({
  initial: 'setup',
  context: ({input}) => ({
    ...input,
    listeners: {},
    subscriptions: [],
    queue: [],
  }),
  on: {
    HALT: {
      target: '.cleanup',
    },
    EVENT: {
      actions: [
        {
          type: 'enqueue',
          params: ({event: {event}}) => ({event}),
        },
      ],
    },
  },
  states: {
    setup: {
      entry: [log('setting up reporter')],
      invoke: {
        src: 'setupReporter',
        input: ({context: {reporter}}) => reporter,
        onError: {
          target: 'done',
          actions: [
            log(({event: {error}}) => `error setting up reporter: ${error}`),
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
          ],
        },
        onDone: {
          target: 'listening',
          actions: [
            log('binding...'),
            {type: 'createListeners'},
            {type: 'subscribe'},
          ],
        },
      },
      exit: [log('setup complete')],
    },
    listening: {
      always: [
        {
          guard: {type: 'hasEvents'},
          target: 'draining',
        },
      ],
    },
    draining: {
      invoke: {
        src: 'drainQueue',
        input: ({context: {reporter, listeners, queue}}) => ({
          queue,
          reporter,
          listeners,
        }),
        onDone: {
          target: 'listening',
        },
        onError: {
          target: 'listening',
          actions: [
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
          ],
        },
      },
    },
    cleanup: {
      initial: 'unsubscribing',
      entry: [log('cleaning up...')],
      states: {
        unsubscribing: {
          entry: [log('unsubscribing'), {type: 'unsubscribe'}],
          always: [
            {
              target: 'draining',
              guard: {type: 'hasEvents'},
            },
            {
              target: 'teardown',
              guard: {type: 'isQueueEmpty'},
            },
          ],
        },
        draining: {
          invoke: {
            src: 'drainQueue',
            input: ({context: {reporter, listeners, queue}}) => ({
              queue,
              reporter,
              listeners,
            }),
            onDone: {
              target: 'teardown',
            },
            onError: {
              target: 'teardown',
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => ({error}),
                },
              ],
            },
          },
          exit: [{type: 'destroyListeners'}],
        },
        teardown: {
          entry: log('tearing down'),
          type: 'final',
          invoke: {
            src: 'teardownReporter',
            input: ({context: {reporter}}) => reporter,
            onError: {
              actions: [
                {
                  type: 'assignError',
                  params: ({event: {error}}) => ({error}),
                },
              ],
            },
          },
        },
      },
      onDone: {
        target: 'done',
      },
    },
    done: {
      type: 'final',
    },
    errored: {
      entry: [log(({context: {error}}) => `finished w/ error: ${error}`)],
      type: 'final',
    },
  },
  output: ({context: {error}, self: {id}}) =>
    error ? {type: 'ERROR', error, id} : {type: 'OK', id},
});
