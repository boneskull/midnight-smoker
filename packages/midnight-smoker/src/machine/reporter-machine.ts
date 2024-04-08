import {ReporterListenerEventMap, type ReporterListeners} from '#reporter';
import {type SomeReporter} from '#reporter/reporter';
import {type EventData} from '#schema';
import {isFunction, pickBy} from 'lodash';
import {
  assign,
  fromPromise,
  setup,
  type ActorRefFrom,
  type Subscription,
} from 'xstate';
import {type ControlMachine} from './controller/control-machine';
import {type CtrlEmitted} from './controller/control-machine-events';

export interface RMInput {
  reporter: SomeReporter;
  emitter: ActorRefFrom<typeof ControlMachine>;
}

export interface RMContext extends RMInput {
  listeners: Partial<ReporterListeners>;
  subscriptions: Subscription[];
}

export const setupReporter = fromPromise<void, SomeReporter>(
  async ({input: reporter}): Promise<void> => {
    await reporter.setup();
  },
);
export const ReporterMachine = setup({
  types: {
    context: {} as RMContext,
    input: {} as RMInput,
    events: {} as {
      type: 'EVENT';
      event: CtrlEmitted;
    },
  },
  actors: {
    setupReporter,
    invokeListener: fromPromise<
      void,
      {
        event: CtrlEmitted;
        listeners: Partial<ReporterListeners>;
        reporter: SomeReporter;
      }
    >(async ({input: {reporter, event, listeners}}) => {
      const listener = listeners[event.type as keyof ReporterListeners];
      if (listener) {
        const payload = {...event, event: event.type} as EventData<
          typeof event.type
        >;
        await reporter.invokeListener(payload);
      }
    }),
  },
}).createMachine({
  initial: 'setup',
  context: ({input}) => ({...input, listeners: {}, subscriptions: []}),
  states: {
    setup: {
      invoke: {
        src: 'setupReporter',
        input: ({context: {reporter}}) => reporter,
      },
      onDone: {
        target: 'ready',
        actions: [
          assign({
            listeners: ({context: {reporter}}) => {
              const listeners = pickBy(
                reporter.def,
                (val, key) =>
                  key in ReporterListenerEventMap && isFunction(val),
              ) as Partial<ReporterListeners>;

              return listeners;
            },
            subscriptions: ({self, context: {emitter, listeners}}) => {
              const listenerNames = Object.keys(listeners);
              return listenerNames.map((methodName) => {
                const eventName =
                  ReporterListenerEventMap[
                    methodName as keyof typeof ReporterListenerEventMap
                  ];
                // @ts-expect-error not done w/ impl
                return emitter.on(eventName, (event) => {
                  self.send({type: 'EVENT', event});
                });
              });
            },
          }),
        ],
      },
    },
    ready: {
      on: {
        EVENT: {
          target: 'invoking',
        },
      },
    },
    invoking: {
      invoke: {
        src: 'invokeListener',
        input: ({context: {reporter, listeners}, event: {event}}) => ({
          event,
          reporter,
          listeners,
        }),
        onDone: {
          target: 'ready',
        },
      },
    },
  },
});
