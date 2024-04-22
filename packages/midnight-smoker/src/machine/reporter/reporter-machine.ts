import {type ReporterError} from '#error';
import {type CtrlEmitted} from '#machine/controller';
import {type MachineOutputError, type MachineOutputOk} from '#machine/util';
import {type SomeReporter} from '#reporter/reporter';
import {isEmpty} from 'lodash';
import {assign, log, not, setup, type ActorRef} from 'xstate';
import {drainQueue} from './reporter-machine-actors';
import {type ReporterMachineEvents} from './reporter-machine-events';

export type ReporterMachineOutput =
  | ReporterMachineOutputOk
  | ReporterMachineOutputError;

export type ReporterMachineOutputError = MachineOutputError;

export type ReporterMachineOutputOk = MachineOutputOk;

export interface ReporterMachineContext extends ReporterMachineInput {
  error?: ReporterError;
  queue: CtrlEmitted[];
  shouldHalt: boolean;
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
    drainQueue,
  },
  guards: {
    hasEvents: not('isQueueEmpty'),
    isQueueEmpty: ({context: {queue}}) => isEmpty(queue),
    hasError: ({context: {error}}) => Boolean(error),
    notHasError: not('hasError'),
    shouldHalt: ({context: {queue, shouldHalt}}) =>
      Boolean(shouldHalt && isEmpty(queue)),
    shouldListen: not('shouldHalt'),
  },
  actions: {
    assignError: assign({
      error: (_, {error}: {error: ReporterError}) => error,
    }),
    enqueue: assign({
      queue: ({context: {queue}}, {event}: {event: CtrlEmitted}) => [
        ...queue,
        event,
      ],
    }),
    assignShouldHalt: assign({shouldHalt: true}),
  },
}).createMachine({
  initial: 'listening',
  context: ({input}) => ({
    ...input,
    queue: [],
    shouldHalt: false,
  }),
  id: 'ReporterMachine',
  on: {
    HALT: {
      description: 'Mark the machine for halting after draining the queue',
      actions: [
        log(
          ({context: {queue}}) =>
            `will halt after emitting ${queue.length} event(s)`,
        ),
        {
          type: 'assignShouldHalt',
        },
      ],
    },
    EVENT: [
      {
        description:
          'Ignore event if marked for halting; this may or may not ever happen',
        guard: {type: 'shouldHalt'},
        actions: [
          log(
            ({
              event: {
                event: {type},
              },
            }) => `received event during cleanup operation: ${type}; ignoring`,
          ),
        ],
      },
      {
        description: 'Enqueue the event for re-emission to the reporter',
        guard: {type: 'shouldListen'},
        actions: [
          {
            type: 'enqueue',
            params: ({event: {event}}) => ({event}),
          },
        ],
      },
    ],
  },
  states: {
    listening: {
      description: 'Determines whether to process events or exit',
      always: [
        {
          guard: {type: 'hasEvents'},
          target: '#ReporterMachine.draining',
        },
        {
          guard: {type: 'shouldHalt'},
          target: '#ReporterMachine.done',
        },
      ],
    },
    draining: {
      description: 'Drains the event queue by emitting events to the reporter',
      invoke: {
        src: 'drainQueue',
        input: ({context: {reporter, queue}}) => ({
          queue,
          reporter,
        }),
        onDone: {
          target: '#ReporterMachine.listening',
        },
        onError: {
          target: '#ReporterMachine.errored',
          actions: [
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error: error as ReporterError}),
            },
          ],
        },
      },
    },
    done: {
      type: 'final',
    },
    errored: {
      entry: [log(({context: {error}}) => error)],
      type: 'final',
    },
  },
  output: ({context: {error}, self: {id}}) =>
    error ? {type: 'ERROR', error, id} : {type: 'OK', id},
});
