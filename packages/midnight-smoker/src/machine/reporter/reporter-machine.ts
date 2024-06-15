import {ERROR, FINAL, OK} from '#constants';
import {MachineError} from '#error/machine-error';
import {type SomeDataForEvent} from '#event/events';
import {type ActorOutput} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type ReporterDef} from '#schema/reporter-def';
import {fromUnknownError} from '#util/error-util';
import {serialize} from '#util/serialize';
import {isEmpty} from 'lodash';
import {type PackageJson} from 'type-fest';
import {and, assign, log, not, setup} from 'xstate';
import {
  drainQueue,
  setupReporter,
  teardownReporter,
} from './reporter-machine-actors';
import {
  type PartialReporterContext,
  type ReporterMachineEvents,
} from './reporter-machine-events';

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
  ctx: PartialReporterContext;
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

    shouldShutdown: ({context: {shouldShutdown}}) => Boolean(shouldShutdown),

    /**
     * If the `shouldHalt` context property is falsy, this guard will return
     * `true`.
     */
    shouldListen: not('shouldHalt'),
  },
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
    shouldShutdown: assign({shouldShutdown: true}),
  },
}).createMachine({
  initial: 'setup',
  context: ({
    input: {plugin, smokerOptions, smokerPkgJson, ...input},
  }): ReporterMachineContext => ({
    ...input,
    queue: [],
    shouldShutdown: false,
    plugin,
    ctx: {
      plugin: serialize(plugin),
      opts: smokerOptions,
      pkgJson: smokerPkgJson,
    },
  }),
  id: 'ReporterMachine',
  entry: [
    log(
      ({context: {def, plugin}}) =>
        `Starting reporter for ${plugin.id}/${def.name}`,
    ),
  ],
  exit: [log('Stopped')],
  on: {
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
        input: ({context: {def, ctx}}) => ({def, ctx}),
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
        input: ({context: {def, ctx, queue}}) => ({
          queue,
          def,
          ctx,
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
          ],
        },
      },
    },
    teardown: {
      description: 'Runs teardown lifecycle hook for the reporter',
      invoke: {
        src: 'teardownReporter',
        input: ({context: {def, ctx}}) => ({def, ctx}),
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
