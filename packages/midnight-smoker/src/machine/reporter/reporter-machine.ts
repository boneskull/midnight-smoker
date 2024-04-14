import {fromUnknownError} from '#error';
import {ReporterListenerEventMap, type ReporterListeners} from '#reporter';
import {type SomeReporter} from '#reporter/reporter';
import {isFunction, pickBy} from 'lodash';
import {
  assign,
  log,
  not,
  setup,
  type ActorRef,
  type Subscription,
} from 'xstate';
import {type CtrlEmitted} from '../controller/control-machine-events';
import {type MachineOutputError, type MachineOutputOk} from '../machine-util';
import {
  drainQueue,
  setupReporter,
  teardownReporter,
} from './reporter-machine-actors';
import {type ReporterMachineEvents} from './reporter-machine-events';

export type ReporterMachineOutput =
  | ReporterMachineOutputOk
  | ReporterMachineOutputError;
export type ReporterMachineOutputError = MachineOutputError;
export type ReporterMachineOutputOk = MachineOutputOk;

export interface ReporterMachineContext extends ReporterMachineInput {
  error?: Error;
  listeners: Partial<ReporterListeners>;
  queue: CtrlEmitted[];
  subscriptions: Subscription[];
}

export interface ReporterMachineInput {
  emitter: ActorRef<any, any, CtrlEmitted>;
  reporter: SomeReporter;
}

export const ReporterMachine = setup({
  types: {
    context: {} as ReporterMachineContext,
    input: {} as ReporterMachineInput,
    events: {} as ReporterMachineEvents,
    output: {} as ReporterMachineOutput,
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
    // unsubscribe: assign({
    //   subscriptions: ({context: {subscriptions}}) => {
    //     subscriptions.forEach((sub) => {
    //       sub.unsubscribe();
    //     });
    //     return [];
    //   },
    // }),
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
    //   subscribe: assign({
    //     subscriptions: ({self, context: {emitter, listeners}}) => {
    //       const listenerNames = Object.keys(listeners);
    //       return listenerNames.map((methodName) => {
    //         const eventName =
    //           ReporterListenerEventMap[
    //             methodName as keyof typeof ReporterListenerEventMap
    //           ];

    //         // @ts-expect-error not done yet
    //         return emitter.on(eventName, (event) => {
    //           self.send({type: 'EVENT', event});
    //         });
    //       });
    //     },
    //   }),
  },
}).createMachine({
  initial: 'setup',
  context: ({input}) => ({
    ...input,
    listeners: {},
    subscriptions: [],
    queue: [],
  }),
  id: 'ReporterMachine',
  on: {
    HALT: {
      target: '.cleanup',
    },
    EVENT: {
      actions: [
        log(({event: {event}}) => `enqueuing ${event.type}`),
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
            // {type: 'subscribe'},
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
      entry: [log(({context: {queue}}) => `draining queue: ${queue.length}`)],
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
      exit: [log('drained')],
    },
    cleanup: {
      initial: 'unsubscribing',
      entry: [log('cleaning up...')],
      states: {
        unsubscribing: {
          // entry: [log('unsubscribing'), {type: 'unsubscribe'}],
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
        },
        teardown: {
          entry: [log('tearing down'), {type: 'destroyListeners'}],

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
              target: '#ReporterMachine.errored',
            },
            onDone: {
              target: 'done',
            },
          },
        },
        done: {
          type: 'final',
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
