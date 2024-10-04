import {ERROR, FINAL, OK} from '#constants';
import {LifecycleError} from '#error/lifecycle-error';
import {MachineError} from '#error/machine-error';
import {type SomeDataForEvent} from '#event/events';
import {
  flushQueueLogic,
  type FlushQueueLogicInput,
} from '#machine/actor/flush-queue';
import {
  setupReporterLogic,
  teardownReporterLogic,
} from '#machine/actor/reporter-lifecycle';
import {type AbortEvent} from '#machine/event/abort';
import {
  type ActorOutput,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
} from '#machine/util';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {
  type ReporterContext,
  ReporterContextSubject,
} from '#reporter/reporter-context';
import {type Reporter} from '#schema/reporter';
import {type SmokerOptions} from '#schema/smoker-options';
import {fromUnknownError} from '#util/from-unknown-error';
import {isEmpty} from 'lodash';
import {type EventEmitter} from 'node:events';
import {type PackageJson} from 'type-fest';
import {and, assign, log, not, setup} from 'xstate';

/**
 * All events received by a `ReporterMachine`.
 */
export type ReporterMachineEvent =
  | AbortEvent
  | ReporterMachineHaltEvent
  | ReporterMachineSmokeMachineEvent;

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
  extends Omit<ReporterMachineInput, 'smokerOptions' | 'smokerPkgJson'> {
  /**
   * The object passed to {@link flushQueueLogic} which `Reporter` listeners
   * receive.
   */
  ctx: ReporterContext;
  error?: MachineError;

  /**
   * As events are emitted from the event bus, they are put into this queue.
   *
   * The machine uses a guard to check if the queue is non-empty; if it is, it
   * transitions to the `flushing` state, which invokes {@link flushQueueLogic}.
   */
  queue: SomeDataForEvent[];

  /**
   * If this is `true`, then the reporter will halt after flushing its queue via
   * {@link flushQueueLogic}.
   *
   * It's not expected that the `ReporterMachine` will receive an event after
   * this becomes `true`; however, there is nothing preventing it from
   * happening. If it _does_ happen, it will be ignored.
   */
  shouldShutdown: boolean;

  subject?: ReporterContextSubject;
}

export interface ReporterMachineSmokeMachineEvent {
  event: SomeDataForEvent;
  type: 'EVENT';
}

export interface ReporterMachineHaltEvent {
  type: 'HALT';
}

/**
 * Input for {@link ReporterMachine}
 */
export interface ReporterMachineInput {
  /**
   * Optional {@link EventEmitter} which will emit all events received.
   */
  auxEmitter?: EventEmitter;

  /**
   * The plugin itself; owner of the reporter definition
   */
  plugin: Readonly<PluginMetadata>;

  /**
   * Reporter definition (registered by a plugin)
   */
  reporter: Reporter;

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
 * {@link ReporterMachineInput.reporter Reporter}
 */
export const ReporterMachine = setup({
  actions: {
    /**
     * Assigns to {@link ReporterMachineContext.error context.error}
     */
    assignError: assign({
      error: ({context, self}, {error}: {error: unknown}) => {
        const err = fromUnknownError(error);

        if (context.error) {
          return context.error.cloneWith(err);
        }
        return new MachineError(
          `Reporter errored: ${err.message}`,
          err,
          self.id,
        );
      },
    }),

    /**
     * Enqueues any event emitted by the event bus machines
     */
    enqueue: assign({
      queue: ({context: {queue}}, {event}: {event: SomeDataForEvent}) => [
        ...queue,
        event,
      ],
    }),

    [INIT_ACTION]: DEFAULT_INIT_ACTION(),
    shouldShutdown: assign({shouldShutdown: true}),
  },
  actors: {
    flushQueue: flushQueueLogic,
    setupReporter: setupReporterLogic,
    teardownReporter: teardownReporterLogic,
  },
  guards: {
    /**
     * If the queue contains events, this guard will return `true`.
     */
    hasEvents: not('hasNoEvents'),

    /**
     * If the queue is empty, this guard will return `true`
     */
    hasNoEvents: ({context: {queue}}) => isEmpty(queue),

    /**
     * If the `shouldHalt` context property is `true` _and_ the queue is empty,
     * this guard will return `true`.
     */
    shouldHalt: and(['hasNoEvents', 'shouldShutdown']),

    /**
     * If the `shouldHalt` context property is falsy, this guard will return
     * `true`.
     */
    shouldListen: not('shouldHalt'),

    shouldShutdown: ({context: {shouldShutdown}}) => !!shouldShutdown,
  },
  types: {
    context: {} as ReporterMachineContext,
    events: {} as ReporterMachineEvent,
    input: {} as ReporterMachineInput,
    output: {} as ReporterMachineOutput,
  },
}).createMachine({
  context: ({
    input: {plugin, smokerOptions, smokerPkgJson, ...input},
  }): ReporterMachineContext => {
    const subject = ReporterContextSubject.create();
    const ctx = subject.createReporterContext(
      smokerOptions,
      smokerPkgJson,
      plugin,
    );
    return {
      ...input,
      ctx,
      plugin,
      queue: [],
      shouldShutdown: false,
      subject,
    };
  },
  entry: [
    INIT_ACTION,
    log(
      ({context: {plugin, reporter}}) =>
        `Starting reporter for ${plugin.id}/${reporter.name}`,
    ),
  ],
  exit: [log('Stopped')],
  id: 'ReporterMachine',
  initial: 'setup',
  on: {
    EVENT: [
      {
        actions: [
          log(
            ({
              event: {
                event: {type},
              },
            }) => `received event during cleanup operation: ${type}; ignoring`,
          ),
        ],
        description:
          'Ignore event if marked for halting; this may or may not ever happen',
        guard: {type: 'shouldShutdown'},
      },
      {
        actions: [
          {
            params: ({event: {event}}) => ({event}),
            type: 'enqueue',
          },
        ],
        description: 'Enqueue the event for re-emission to the reporter',
        guard: {type: 'shouldListen'},
      },
    ],
    HALT: {
      actions: [
        log(
          ({context: {queue}}) =>
            `will halt after emitting ${queue.length} event(s)`,
        ),
        {
          type: 'shouldShutdown',
        },
      ],
      description: 'Mark the machine for halting after flushing the queue',
    },
  },
  output: ({context: {error}, self: {id: actorId}}) =>
    error ? {actorId, error, type: ERROR} : {actorId, type: OK},
  states: {
    done: {
      type: FINAL,
    },
    errored: {
      type: FINAL,
    },
    flushing: {
      description: 'Drains the event queue by emitting events to the reporter',
      invoke: {
        input: ({context: {ctx, queue, reporter}}): FlushQueueLogicInput => ({
          ctx,
          queue,
          reporter,
        }),
        onDone: {
          target: 'listening',
        },
        onError: {
          actions: [
            {
              params: ({event: {error}}) => ({error}),
              type: 'assignError',
            },
          ],
          target: 'teardown',
        },
        src: 'flushQueue',
      },
    },
    listening: {
      always: [
        {
          guard: {type: 'hasEvents'},
          target: 'flushing',
        },
        {
          guard: {type: 'shouldHalt'},
          target: 'teardown',
        },
      ],
      description: 'Determines whether to process events or exit',
    },
    setup: {
      invoke: {
        input: ({context: {ctx, reporter}}) => ({ctx, reporter}),
        onDone: {
          actions: log('listening for events'),
          target: 'listening',
        },
        onError: {
          actions: [
            {
              params: ({context: {ctx, reporter}, event: {error}}) => {
                return {
                  error: new LifecycleError(
                    error,
                    'setup',
                    'reporter',
                    reporter.name,
                    ctx.plugin,
                  ),
                };
              },
              type: 'assignError',
            },
          ],
          target: 'teardown',
        },
        src: 'setupReporter',
      },
    },
    teardown: {
      description: 'Runs teardown lifecycle hook for the reporter',
      entry: [
        assign({
          subject: ({context: {subject}}) => {
            subject?.complete();
            subject?.[Symbol.dispose]();
            return undefined;
          },
        }),
      ],
      invoke: {
        input: ({context: {ctx, reporter}}) => ({ctx, reporter}),
        onDone: {
          target: 'done',
        },
        onError: {
          actions: [
            {
              params: ({context: {ctx, reporter}, event: {error}}) => {
                return {
                  error: new LifecycleError(
                    error,
                    'teardown',
                    'reporter',
                    reporter.name,
                    ctx.plugin,
                  ),
                };
              },
              type: 'assignError',
            },
          ],
          target: 'errored',
        },
        src: 'teardownReporter',
      },
    },
  },
});
