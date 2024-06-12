/**
 * Utilities for testing `xstate` (v5) actors in Node.js
 *
 * @license Apache-2.0 https://apache.org/licenses/LICENSE-2.0
 * @author <boneskull@boneskull.com>
 */
import {scheduler} from 'node:timers/promises';
import {
  Actor,
  createActor,
  toObserver,
  toPromise,
  waitFor,
  type ActorRefFrom,
  type AnyActorLogic,
  type EmittedFrom as EmittedFromLogic,
  type EventFromLogic,
  type ExtractEvent,
  type InputFrom,
  type InspectionEvent,
  type OutputFrom,
  type SnapshotFrom,
} from 'xstate';

/**
 * Any event or emitted-event from an actor
 */
export type ActorEvent<T extends AnyActorLogic> =
  | EventFromLogic<T>
  | EmittedFromLogic<T>;

/**
 * The `type` prop of any event or emitted event from an actor
 */
export type ActorEventType<T extends AnyActorLogic> = ActorEvent<T>['type'];

/**
 * Frankenpromise that is both a `Promise` and an {@link Actor}.
 *
 * Returned by some methods in {@link ActorRunner}
 */
export type ActorPromise<T extends AnyActorLogic, Out = void> = Promise<Out> &
  Actor<T>;

/**
 * Helps test actor behavior
 *
 * @template T Actor logic (machine, `fromPromise`, etc.)
 */
export type ActorRunner<T extends AnyActorLogic> = {
  run: RunFn<T>;
  start: StartFn<T>;
  runUntilEvent: RunUntilEventFn<T>;
  runUntilSnapshot: RunUntilSnapshotFn<T>;
  runUntilTransition: RunUntilTransitionFn<T>;
  waitForActor: WaitForActorFn<T>;
};

/**
 * Lookup for event/emitted-event based on type
 */
export type EventFromEventType<
  T extends AnyActorLogic,
  K extends ActorEventType<T>,
> = ExtractEvent<ActorEvent<T>, K>;

/**
 * Runs an actor to completion (or timeout) and fulfills with its output.
 *
 * @param input Actor input
 * @param options Options
 * @returns `Promise` fulfilling with the actor output
 */
export type RunFn<T extends AnyActorLogic> = (
  input: InputFrom<T>,
  opts?: ActorRunnerOptions,
) => ActorPromise<T, OutputFrom<T>>;

/**
 * Returns a combination of a `Promise` and an {@link Actor} so that events may
 * be sent to the actor.
 *
 * Immediately stops the machine thereafter.
 *
 * @param events One or more _event names_ (the `type` field) to wait for (in
 *   order)
 * @param input Actor input
 * @param options Options
 * @returns An {@link ActorPromise} which fulfills with the matching events
 *   (assuming they all occurred in order)
 * @todo Allow matching against an `EventObject`
 */
export type RunUntilEventFn<T extends AnyActorLogic> = <
  EventTypes extends [ActorEventType<T>, ...ActorEventType<T>],
>(
  events: EventTypes,
  input: InputFrom<T>,
  opts?: Omit<ActorRunnerOptions, 'inspect'>,
) => ActorPromise<
  T,
  {[K in keyof EventTypes]: EventFromEventType<T, EventTypes[K]>}
>;

/**
 * Runs a machine until the snapshot predicate returns `true`.
 *
 * Immediately stops the machine thereafter.
 *
 * @param predicate Snapshot predicate; see {@link waitFor}
 * @param input Actor input
 * @param options Options
 * @returns `Promise` resolving with the snapshot that matches the predicate
 */
export type RunUntilSnapshotFn<T extends AnyActorLogic> = (
  predicate: (snapshot: SnapshotFrom<T>) => boolean,
  input: InputFrom<T> | Actor<T>,
  opts?: ActorRunnerOptions,
) => Promise<SnapshotFrom<T>>;

/**
 * Runs the machine until a transition from the `source` state to the `target`
 * state occurs.
 *
 * Immediately stops the machine thereafter. Returns a combination of a
 * `Promise` and an {@link Actor} so that events may be sent to the actor.
 *
 * @param source Source state ID
 * @param target Target state ID
 * @param input Machine input
 * @param opts Options
 * @returns An {@link ActorPromise} that resolves when the specified transition
 *   occurs
 * @todo Type narrowing for `source` and `target` once xstate supports it
 */
export type RunUntilTransitionFn<T extends AnyActorLogic> = (
  source: string,
  target: string,
  input: InputFrom<T>,
  opts?: Omit<ActorRunnerOptions, 'inspect'>,
) => ActorPromise<T>;

/**
 * Starts the actor and returns the {@link Actor} object.
 *
 * @param input Actor input
 * @param options Options
 * @returns The {@link Actor} itself
 */
export type StartFn<T extends AnyActorLogic> = (
  input: InputFrom<T>,
  opts?: Omit<ActorRunnerOptions, 'timeout'>,
) => Actor<T>;

export type WaitForActorFn<T extends AnyActorLogic> = <
  U extends AnyActorLogic = AnyActorLogic,
>(
  actorId: string | RegExp,
  input: InputFrom<T> | Actor<T>,
  opts?: Omit<ActorRunnerOptions, 'inspect'>,
) => ActorPromise<T, ActorRefFrom<U>>;

/**
 * Options for methods in {@link ActorRunner}
 */
export interface ActorRunnerOptions {
  inspect?: (evt: InspectionEvent) => void;
  logger?: (...args: any[]) => void;
  timeout?: number;
}

/**
 * Creates an {@link ActorRunner} for the given `actorLogic` which helps test
 * actor behavior
 *
 * @param actorLogic Actor definition; may be a machine
 * @param defaultOptions Default options for all methods in the returned
 *   {@link ActorRunner}
 * @returns {@link ActorRunner}
 */
export function createActorRunner<T extends AnyActorLogic>(
  actorLogic: T,
  {
    logger: defaultLogger = noop,
    inspect: defaultInspector = noop,
    timeout: defaultTimeout = DEFAULT_TIMEOUT,
  }: ActorRunnerOptions = {},
): ActorRunner<T> {
  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * Returns a combination of a `Promise` and an {@link Actor} so that events may
   * be sent to the actor.
   *
   * @param input Actor input
   * @param options Options
   * @returns {@link ActorPromise} Which fulfills with the actor output
   */
  const run: RunFn<T> = (
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      inspect = defaultInspector,
      timeout = defaultTimeout,
    }: ActorRunnerOptions = {},
  ): ActorPromise<T, OutputFrom<T>> => {
    const actor = createActor(actorLogic, {
      input,
      logger,
      inspect,
    });
    // order is important: create promise, then start.
    const actorPromise = toPromise(actor);
    actor.start();
    return Object.assign(
      Promise.race([
        actorPromise,
        scheduler.wait(timeout).then(() => {
          throw new Error(`Machine did not complete in ${timeout}ms`);
        }),
      ]),
      actor,
    );
  };

  /**
   * Starts the actor and returns the {@link Actor} object.
   *
   * @param input Actor input
   * @param options Options
   * @returns The {@link Actor} itself
   */
  const start: StartFn<T> = (
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      inspect = defaultInspector,
    }: Omit<ActorRunnerOptions, 'timeout'> = {},
  ): Actor<T> => {
    const actor = createActor(actorLogic, {
      input,
      logger,
      inspect,
    });
    actor.start();
    return actor;
  };

  /**
   * Returns a combination of a `Promise` and an {@link Actor} so that events may
   * be sent to the actor.
   *
   * Immediately stops the machine thereafter.
   *
   * @param eventType One or more _event names_ (the `type` field) to wait for
   *   (in order)
   * @param input Actor input
   * @param options Options
   * @returns An {@link ActorPromise} which fulfills when the event(s) have been
   *   sent or emitted (in order)
   * @todo Allow matching against an `EventObject`
   */
  const runUntilEvent: RunUntilEventFn<T> = <
    const EventTypes extends [ActorEventType<T>, ...ActorEventType<T>],
  >(
    events: EventTypes,
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      timeout = defaultTimeout,
    }: Omit<ActorRunnerOptions, 'inspect'> = {},
  ): ActorPromise<
    T,
    {[K in keyof EventTypes]: EventFromEventType<T, EventTypes[K]>}
  > => {
    const queue = [...events];
    if (!queue.length) {
      throw new TypeError('Expected one or more event names');
    }
    const emitted: {
      [K in keyof EventTypes]: EventFromEventType<T, EventTypes[K]>;
    } = [] as any;
    const actor = start(input, {
      logger,
      inspect: (evt) => {
        if (
          evt.type === '@xstate.event' &&
          queue[0] === evt.event.type &&
          evt.sourceRef === actor
        ) {
          emitted.push(evt.event as EventFromEventType<T, (typeof queue)[0]>);
          queue.shift();
          if (!queue.length) {
            actor.stop();
          }
        }
      },
    });
    return Object.assign(
      Promise.race([
        toPromise(actor),
        scheduler.wait(timeout).then(() => {
          const event = queue[0];
          if (event) {
            throw new Error(`Event not sent in ${timeout} ms: ${event}`);
          }
          throw new Error(
            `All events sent in order, but machine timed out in ${timeout}ms`,
          );
        }),
      ])
        .then(() => {
          if (queue.length === 1) {
            throw new Error(`Event not sent nor emitted: ${queue[0]}`);
          }
          if (queue.length > 1) {
            throw new Error(`Events not sent nor emitted: ${queue.join(', ')}`);
          }
          return emitted;
        })
        .finally(() => {
          actor.stop();
        }),
      actor,
    );
  };

  /**
   * Runs a machine until the snapshot predicate returns `true`.
   *
   * Immediately stops the machine thereafter.
   *
   * Returns a combination of a `Promise` and an {@link Actor} so that events may
   * be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link waitFor}
   * @param input Actor input
   * @param options Options
   * @returns {@link ActorPromise} Fulfilling with the snapshot that matches the
   *   predicate
   */
  const runUntilSnapshot: RunUntilSnapshotFn<T> = (
    predicate: (snapshot: SnapshotFrom<T>) => boolean,
    input: InputFrom<T> | Actor<T>,
    {
      logger = defaultLogger,
      inspect = defaultInspector,
      timeout = defaultTimeout,
    }: ActorRunnerOptions = {},
  ): ActorPromise<T, SnapshotFrom<T>> => {
    const actor =
      input instanceof Actor
        ? input
        : start(input, {
            logger,
            inspect,
          });

    return Object.assign(
      waitFor(actor, predicate, {timeout})
        .catch((err) => {
          // TODO suggest error codes or Error subclasses or smth for xstate
          if ((err as Error)?.message.startsWith('Timeout of')) {
            throw new Error(
              `Machine snapshot did not match predicate in ${timeout}ms`,
            );
          }
          throw err;
        })
        .finally(() => {
          actor.stop();
        }),
      actor,
    );
  };

  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Immediately stops the machine thereafter. Returns a combination of a
   * `Promise` and an {@link Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Machine input
   * @param opts Options
   * @returns An {@link ActorPromise} that resolves when the specified transition
   *   occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   */
  const runUntilTransition: RunUntilTransitionFn<T> = (
    source: string,
    target: string,
    input: InputFrom<T>,
    {
      logger = defaultLogger,
      timeout = defaultTimeout,
    }: Omit<ActorRunnerOptions, 'inspect'> = {},
  ): ActorPromise<T> => {
    const actor = start(input, {
      logger,
      inspect: (evt) => {
        if (
          evt.type === '@xstate.microstep' &&
          evt._transitions.some((tDef) => {
            return (
              tDef.source.id === source &&
              tDef.target?.some((t) => t.id === target)
            );
          })
        ) {
          actor.stop();
        }
      },
    });
    return Object.assign(
      Promise.race([
        toPromise(actor),
        scheduler.wait(timeout).then(() => {
          throw new Error(
            `Failed to detect a transition from ${source} to ${target} in ${timeout}ms`,
          );
        }),
      ])
        .then(noop)
        .finally(() => {
          actor.stop();
        }),
      actor,
    );
  };

  const waitForActor: WaitForActorFn<T> = <
    U extends AnyActorLogic = AnyActorLogic,
  >(
    actorId: string | RegExp,
    input: InputFrom<T> | Actor<T>,
    {
      logger = defaultLogger,
      timeout = defaultTimeout,
    }: Omit<ActorRunnerOptions, 'inspect'> = {},
  ): ActorPromise<T, ActorRefFrom<U>> => {
    const actor =
      input instanceof Actor
        ? input
        : start(input, {
            logger,
          });

    const predicate =
      typeof actorId === 'string'
        ? (id: string) => id === actorId
        : (id: string) => actorId.test(id);

    return Object.assign(
      Promise.race([
        new Promise<ActorRefFrom<U>>((resolve) => {
          actor.system.inspect(
            toObserver((evt) => {
              if (evt.type === '@xstate.actor' && predicate(evt.actorRef.id)) {
                resolve(evt.actorRef as ActorRefFrom<U>);
              }
            }),
          );
        }),
        scheduler.wait(timeout).then(() => {
          throw new Error(
            `Failed to detect an spawned actor matching ${actorId} in ${timeout}ms`,
          );
        }),
      ]),
      actor,
    );
  };

  return {
    run,
    start,
    runUntilEvent,
    runUntilSnapshot,
    runUntilTransition,
    waitForActor,
  };
}

/**
 * That's a no-op, folks
 */
const noop = () => {};

/**
 * Default timeout (in ms) for any of the "run until" methods in
 * {@link ActorRunner}
 */
const DEFAULT_TIMEOUT = 1000;
