import {type ReporterError} from '#error/reporter-error';
import {type CtrlMachineEmitted} from '#machine/control';
import {ERROR, FINAL, OK, type ActorOutput} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {
  type SomeReporterContext,
  type SomeReporterDef,
} from '#schema/reporter-def';
import {isEmpty} from 'lodash';
import {type PackageJson} from 'type-fest';
import {and, assign, log, not, setup} from 'xstate';
import {
  drainQueue,
  setupReporter,
  teardownReporter,
} from './reporter-machine-actors';
import {type ReporterMachineEvents} from './reporter-machine-events';

/**
 * Output for {@link ReporterMachine}
 *
 * `ReporterMachine` outputs nothing machine-specific.
 */
export type ReporterMachineOutput = ActorOutput;

/**
 * The machine context stuffs {@link ReporterMachineInput.smokerPkgJson} and
 * {@link ReporterMachineInput.smokerOptions} into
 * {@link ReporterMachineContext.ctx its `ReporterContext` object}.
 */
export interface ReporterMachineContext
  extends Omit<ReporterMachineInput, 'smokerPkgJson' | 'smokerOptions'> {
  /**
   * If a `ReporterDef` throws an error, it will be caught and re-thrown as a
   * {@link ReporterError} by {@link drainQueue}, {@link setupReporter} or
   * {@link teardownReporter}.
   */
  error?: ReporterError;

  /**
   * As events are emitted from the event bus, they are put into this queue.
   *
   * The machine uses a guard to check if the queue is non-empty; if it is, it
   * transitions to the `draining` state, which invokes {@link drainQueue}.
   */
  queue: CtrlMachineEmitted[];

  /**
   * If this is `true`, then the reporter will halt after draining its queue via
   * {@link drainQueue}.
   *
   * It's not expected that the `ReporterMachine` will receive an event after
   * this becomes `true`; however, there is nothing preventing it from
   * happening. If it _does_ happen, a debug message will be logged.
   */
  shouldHalt: boolean;

  /**
   * The object passed to all of the `ReporterDef`'s listener methods.
   */
  ctx: SomeReporterContext;
}

/**
 * Input for {@link ReporterMachine}
 */
export interface ReporterMachineInput {
  /**
   * Reporter definition (registered by a plugin)
   */
  def: SomeReporterDef;

  /**
   * The plugin itself; owner of the reporter definition
   */
  plugin: Readonly<PluginMetadata>;

  /**
   * User-provided options & defaults
   */
  smokerOptions: SmokerOptions;

  /**
   * Contents of `midnight-smoker`'s `package.json`
   */
  smokerPkgJson: PackageJson;
}

/**
 * Bridges the events emitted from the event bus machines to a
 * {@link ReporterMachineInput.def ReporterDef}
 */
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
    /**
     * If the queue contains events, this guard will return `true`.
     */
    hasEvents: not('isQueueEmpty'),

    /**
     * If the queue is empty, this guard will return `true`
     */
    isQueueEmpty: ({context: {queue}}) => isEmpty(queue),

    /**
     * If the `error` context property is truthy, this guard will return `true`.
     */
    hasError: ({context: {error}}) => Boolean(error),

    /**
     * If the `error` context property is falsy, this guard will return `true`.
     */
    notHasError: not('hasError'),

    /**
     * If the `shouldHalt` context property is `true` _and_ the queue is empty,
     * this guard will return `true`.
     */
    shouldHalt: and([
      'isQueueEmpty',
      ({context: {shouldHalt}}) => Boolean(shouldHalt),
    ]),

    /**
     * If the `shouldHalt` context property is falsy, this guard will return
     * `true`.
     */
    shouldListen: ({context: {shouldHalt}}) => !shouldHalt,
  },
  actions: {
    /**
     * Assigns to {@link ReporterMachineContext.error context.error}
     */
    assignError: assign({
      error: (_, error: ReporterError) => error,
    }),

    /**
     * Enqueues any event emitted by the event bus machines
     */
    enqueue: assign({
      queue: ({context: {queue}}, {event}: {event: CtrlMachineEmitted}) => [
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
        `Starting ReporterMachine for reporter: ${def.name} from ${plugin.id}`,
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
              params: ({event: {error}}) => error as ReporterError,
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
              params: ({event: {error}}) => error as ReporterError,
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
              params: ({event: {error}}) => error as ReporterError,
            },
          ],
        },
      },
    },
    done: {
      type: FINAL,
    },
    errored: {
      entry: [log(({context: {error}}) => error)],
      type: FINAL,
    },
  },
  output: ({context: {error}, self: {id}}) =>
    error ? {type: ERROR, error, id} : {type: OK, id},
});
