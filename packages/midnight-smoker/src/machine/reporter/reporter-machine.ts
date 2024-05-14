import {type ReporterError} from '#error';
import {type ControlMachineEmitted} from '#machine/controller';
import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin';
import {
  type SomeReporterContext,
  type SomeReporterDef,
} from '#schema/reporter-def';
import {isEmpty} from 'lodash';
import {type PackageJson} from 'type-fest';
import {assign, log, not, setup} from 'xstate';
import {
  drainQueue,
  setupReporter,
  teardownReporter,
} from './reporter-machine-actors';
import {type ReporterMachineEvents} from './reporter-machine-events';

export type ReporterMachineOutput =
  | ReporterMachineOutputOk
  | ReporterMachineOutputError;

export type ReporterMachineOutputError = ActorOutputError;

export type ReporterMachineOutputOk = ActorOutputOk;

export interface ReporterMachineContext
  extends Omit<ReporterMachineInput, 'smokerPkgJson' | 'smokerOptions'> {
  error?: ReporterError;
  queue: ControlMachineEmitted[];
  shouldHalt: boolean;
  ctx: SomeReporterContext;
}

export interface ReporterMachineInput {
  def: SomeReporterDef;
  plugin: Readonly<PluginMetadata>;
  smokerOptions: SmokerOptions;
  smokerPkgJson: PackageJson;
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
    setupReporter,
    teardownReporter,
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
      queue: ({context: {queue}}, {event}: {event: ControlMachineEmitted}) => [
        ...queue,
        event,
      ],
    }),
    assignShouldHalt: assign({shouldHalt: true}),
  },
}).createMachine({
  initial: 'setup',
  context: ({input: {plugin, smokerOptions, smokerPkgJson, ...input}}) => ({
    ...input,
    queue: [],
    shouldHalt: false,
    plugin,
    ctx: {
      plugin: plugin.toJSON(),
      opts: smokerOptions,
      pkgJson: smokerPkgJson,
    },
  }),
  id: 'ReporterMachine',
  entry: [
    log(
      ({context: {def, plugin}}) =>
        `starting reporter: ${def.name} (${plugin.id})`,
    ),
  ],
  always: {
    guard: 'hasError',
    actions: [log(({context: {error}}) => `ERROR: ${error?.message}`)],
  },
  exit: [log('stopping reporter')],
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
    setup: {
      invoke: {
        src: 'setupReporter',
        input: ({context}) => ({def: context.def, ctx: context.ctx}),
        onDone: {
          target: 'listening',
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
    listening: {
      description: 'Determines whether to process events or exit',
      always: [
        {
          guard: {type: 'hasEvents'},
          target: '#ReporterMachine.draining',
        },
        {
          guard: {type: 'shouldHalt'},
          target: '#ReporterMachine.teardown',
        },
      ],
    },
    draining: {
      description: 'Drains the event queue by emitting events to the reporter',
      invoke: {
        src: 'drainQueue',
        input: ({context: {def, ctx, queue}}) => ({
          queue,
          def,
          ctx,
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
    teardown: {
      invoke: {
        src: 'teardownReporter',
        input: ({context: {def, ctx}}) => ({def, ctx}),
        onDone: {
          target: 'done',
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
