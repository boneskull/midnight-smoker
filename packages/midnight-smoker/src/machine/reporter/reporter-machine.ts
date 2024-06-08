import {ERROR, FINAL, OK} from '#constants';
import {AbortError} from '#error/abort-error';
import {fromUnknownError} from '#error/from-unknown-error';
import {MachineError} from '#error/machine-error';
import {type SomeDataForEvent} from '#event/events';
import {type ActorOutput} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type ReporterContext, type ReporterDef} from '#schema/reporter-def';
import {isSmokerError} from '#util/error-util';
import {serialize} from '#util/serialize';
import {uniqueId} from '#util/unique-id';
import {isEmpty} from 'lodash';
import {type PackageJson} from 'type-fest';
import {
  and,
  assign,
  log,
  not,
  setup,
  stopChild,
  type ActorRefFrom,
} from 'xstate';
import {abortListener} from '../util/abort-listener';
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
  error?: MachineError;

  /**
   * As events are emitted from the event bus, they are put into this queue.
   *
   * The machine uses a guard to check if the queue is non-empty; if it is, it
   * transitions to the `draining` state, which invokes {@link drainQueue}.
   */
  queue: SomeDataForEvent[];

  /**
   * If this is `true`, then the reporter will halt after draining its queue via
   * {@link drainQueue}.
   *
   * It's not expected that the `ReporterMachine` will receive an event after
   * this becomes `true`; however, there is nothing preventing it from
   * happening. If it _does_ happen, it will be ignored.
   */
  shouldShutdown: boolean;

  /**
   * The object passed to all of the `ReporterDef`'s listener methods.
   */
  ctx: ReporterContext;

  /**
   * Abort controller which can interrupt event queue draining
   */
  drainAbortController: AbortController;

  /**
   * Reference to an {@link abortListener} actor, listening if
   * {@link ReporterMachineInput.signal} aborts
   */
  abortListenerRef?: ActorRefFrom<typeof abortListener>;
}

/**
 * Input for {@link ReporterMachine}
 */
export interface ReporterMachineInput {
  /**
   * Reporter definition (registered by a plugin)
   */
  def: ReporterDef;

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

  /**
   * Signal from parent machine
   */
  signal: AbortSignal;
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
    abortListener,
    drainQueue,
    setupReporter,
    teardownReporter,
  },
  guards: {
    /**
     * If the parent signal was aborted, return `true`
     */
    aborted: ({context: {signal}}) => signal.aborted,

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
     * If the `shouldShutdown` context property is `true`, this guard will
     * return `true`
     */
    shouldShutdown: ({context: {shouldShutdown}}) => Boolean(shouldShutdown),

    /**
     * If the `shouldHalt` context property is falsy, this guard will return
     * `true`.
     */
    shouldListen: and([not('aborted'), not('shouldHalt')]),
  },
  actions: {
    /**
     * Assigns to {@link ReporterMachineContext.error context.error}
     */
    assignError: assign({
      error: ({context, self}, {error}: {error: unknown}) => {
        if (
          isSmokerError(AbortError, context.error) &&
          isSmokerError(AbortError, error)
        ) {
          return context.error;
        }
        const err = fromUnknownError(error);

        if (context.error) {
          return context.error.clone(err);
        }
        return new MachineError(
          `Reporter errored: ${err.message}`,
          err,
          self.id,
        );
      },
    }),

    /**
     * Aborts the
     * {@link ReporterMachineContext.drainAbortController drain abort controller}
     * with an optional error (reason)
     */
    abort: (
      {context: {drainAbortController}},
      {error}: {error?: unknown} = {},
    ) => {
      drainAbortController.abort(error);
    },

    /**
     * Enqueues any event emitted by the event bus machines
     */
    enqueue: assign({
      queue: ({context: {queue}}, {event}: {event: SomeDataForEvent}) => [
        ...queue,
        event,
      ],
    }),

    /**
     * Sets {@link ReporterMachineContext.shouldShutdown} to `true`, which begins
     * the shutdown process
     */
    shouldShutdown: assign({shouldShutdown: true}),

    /**
     * Spawn an {@link abortListener} actor to listen for the parent signal
     */
    startAbortListener: assign({
      abortListenerRef: ({context: {def, signal}, spawn}) => {
        const id = uniqueId({prefix: 'abortListener', postfix: def.name});
        return spawn('abortListener', {id, input: signal});
      },
    }),

    /**
     * Stops the {@link ReporterMachineContext.abortListenerRef abort listener}
     */
    stopAbortListener: assign({
      abortListenerRef: ({context: {abortListenerRef}}) => {
        if (abortListenerRef) {
          abortListenerRef.send({type: 'OFF'});
          stopChild(abortListenerRef);
        }
        return undefined;
      },
    }),
  },
}).createMachine({
  initial: 'setup',
  context: ({
    input: {signal, plugin, smokerOptions, smokerPkgJson, ...input},
  }): ReporterMachineContext => {
    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }
    const abortController = new AbortController();

    return {
      ...input,
      drainAbortController: abortController,
      signal,
      queue: [],
      shouldShutdown: false,
      plugin,
      ctx: {
        plugin: serialize(plugin),
        opts: smokerOptions,
        pkgJson: smokerPkgJson,
      },
    };
  },
  id: 'ReporterMachine',
  entry: [
    log(
      ({context: {def, plugin}}) =>
        `Starting ReporterMachine for reporter: ${def.name} from ${plugin.id}`,
    ),
    {type: 'startAbortListener'},
  ],
  exit: [
    {type: 'abort'},
    {type: 'stopAbortListener'},
    log('stopping reporter'),
  ],
  on: {
    ABORT: {
      description: 'Aborts in-process operations and triggers shutdown routine',
      actions: [
        {type: 'assignError', params: {error: new AbortError()}},
        {type: 'abort'},
        {type: 'shouldShutdown'},
      ],
    },
    HALT: {
      description: 'Mark the machine for halting after draining the queue',
      actions: [
        log(
          ({context: {queue}}) =>
            `will halt after emitting ${queue.length} event(s)`,
        ),
        {
          type: 'shouldShutdown',
        },
      ],
    },
    EVENT: [
      {
        description:
          'Ignore event if marked for halting; this may or may not ever happen',
        guard: {type: 'shouldShutdown'},
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
        input: ({context: {def, ctx, signal}}) => ({def, ctx, signal}),
        onDone: {
          target: 'listening',
        },
        onError: {
          actions: [
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
          ],
          target: 'teardown',
        },
      },
    },
    listening: {
      description: 'Determines whether to process events or exit',
      always: [
        {
          guard: {type: 'hasEvents'},
          target: 'draining',
        },
        {
          guard: {type: 'shouldHalt'},
          target: 'teardown',
        },
      ],
    },
    draining: {
      description: 'Drains the event queue by emitting events to the reporter',
      invoke: {
        src: 'drainQueue',
        input: ({
          context: {def, ctx, queue, drainAbortController, signal},
        }) => ({
          queue,
          def,
          ctx,
          signal: AbortSignal.any([drainAbortController.signal, signal]),
        }),
        onDone: {
          target: 'listening',
        },
        onError: {
          target: 'teardown',
          actions: [
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
            {
              type: 'abort',
              params: ({event: {error}}) => ({error}),
            },
          ],
        },
      },
    },
    teardown: {
      enter: [
        {
          type: 'abort',
        },
      ],
      description:
        'Runs teardown lifecycle hook for the reporter; will not abort on error',
      invoke: {
        src: 'teardownReporter',
        input: ({context: {def, ctx, signal}}) => ({def, ctx, signal}),
        onDone: {
          target: 'done',
        },
        onError: {
          actions: [
            {
              type: 'assignError',
              params: ({event: {error}}) => ({error}),
            },
          ],
          target: 'errored',
        },
      },
    },
    done: {
      type: FINAL,
    },
    errored: {
      type: FINAL,
    },
  },
  output: ({context: {error}, self: {id}}) =>
    error ? {type: ERROR, error, id} : {type: OK, id},
});
