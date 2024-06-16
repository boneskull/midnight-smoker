/**
 * Utilities for testing `xstate` (v5) actors in Node.js
 *
 * @license Apache-2.0 https://apache.org/licenses/LICENSE-2.0
 * @author <boneskull@boneskull.com>
 */
import {bind} from '#util/util';
import {scheduler} from 'node:timers/promises';
import {
  Actor,
  StateMachine,
  createActor,
  toObserver,
  toPromise,
  waitFor,
  type ActorRefFrom,
  type AnyActorLogic,
  type AnyStateMachine,
  type EmittedFrom as EmittedFromLogic,
  type EventFromLogic,
  type ExtractEvent,
  type InputFrom,
  type InspectionEvent,
  type OutputFrom,
  type SnapshotFrom,
  type Subscription,
} from 'xstate';

/**
 * Any event or emitted-event from an actor
 */
export type ActorEvent<T extends AnyActorLogic> =
  | EventFromLogic<T>
  | EmittedFromLogic<T>;

/**
 * A tuple of events emitted by an actor, based on a {@link ActorEventTypeTuple}
 *
 * @see {@link AnyActorRunner.runUntilEvent}
 */
export type ActorEventTuple<
  T extends AnyActorLogic,
  EventTypes extends ActorEventTypeTuple<T>,
> = {[K in keyof EventTypes]: EventFromEventType<T, EventTypes[K]>};

/**
 * The `type` prop of any event or emitted event from an actor
 */
export type ActorEventType<T extends AnyActorLogic> = ActorEvent<T>['type'];

/**
 * A tuple of event types (event names) emitted by an actor
 *
 * @see {@link AnyActorRunner.runUntilEvent}
 */
export type ActorEventTypeTuple<T extends AnyActorLogic> = [
  ActorEventType<T>,
  ...ActorEventType<T>,
];

/**
 * Frankenpromise that is both a `Promise` and an {@link Actor}.
 *
 * Returned by some methods in {@link AnyActorRunner}
 */
export type ActorPromise<T extends AnyActorLogic, Out = void> = Promise<Out> &
  Actor<T>;

/**
 * Lookup for event/emitted-event based on type
 */
export type EventFromEventType<
  T extends AnyActorLogic,
  K extends ActorEventType<T>,
> = ExtractEvent<ActorEvent<T>, K>;

export type ActorRunnerOptionsWithActor = Omit<ActorRunnerOptions, 'id'>;

export type OptionsWithoutInspect<T extends ActorRunnerOptions> = Omit<
  T,
  'inspect'
>;

/**
 * Options for methods in {@link AnyActorRunner}
 */
export interface ActorRunnerOptions {
  /**
   * Default actor ID to use
   */
  id?: string;
  inspect?: (evt: InspectionEvent) => void;
  logger?: (...args: any[]) => void;
  timeout?: number;
}

/**
 * Helpers for testing state machine behavior
 *
 * @remarks
 * Just a wrapper around {@link AnyActorRunner}
 * @template T `StateMachine` actor logic
 */
export class StateMachineRunner<T extends AnyStateMachine>
  implements ActorRunner<T>
{
  constructor(public readonly runner: AnyActorRunner<T>) {}

  get defaultActorLogic() {
    return this.runner.defaultActorLogic;
  }

  get defaultTimeout() {
    return this.runner.defaultTimeout;
  }

  get defaultLogger() {
    return this.runner.defaultLogger;
  }

  get defaultInspector() {
    return this.runner.defaultInspector;
  }

  get defaultId() {
    return this.runner.defaultId;
  }

  get start() {
    return this.runner.start;
  }

  get runUntilDone() {
    return this.runner.runUntilDone;
  }

  get runUntilEvent() {
    return this.runner.runUntilEvent;
  }

  get runUntilSnapshot() {
    return this.runner.runUntilSnapshot;
  }

  get waitForActor() {
    return this.runner.waitForActor;
  }

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
  @bind()
  runUntilTransition(
    source: string,
    target: string,
    input: InputFrom<T> | Actor<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    > = {},
  ): ActorPromise<T> {
    let actor: Actor<T>;

    const {timeout = this.defaultTimeout} = options;
    let sawTransition = false;
    const transitionInspector = (evt: InspectionEvent) => {
      if (actor) {
        if (evt.type === '@xstate.microstep') {
          if (evt.actorRef.id === actor.id) {
            if (
              evt._transitions.some(
                (tDef) =>
                  tDef.source.id === source &&
                  tDef.target?.some((t) => t.id === target),
              )
            ) {
              sawTransition = true;
              actor.stop();
            }
          }
        }
      }
    };

    if (input instanceof StateMachine) {
      actor = input;
      const {logger = this.defaultLogger} =
        options as ActorRunnerOptionsWithActor;
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
      actor.system.inspect(toObserver(transitionInspector));
    } else {
      const {logger = this.defaultLogger, id = this.defaultId} =
        options as ActorRunnerOptions;
      actor = createActor(this.defaultActorLogic, {
        input: input as InputFrom<T>,
        logger,
        inspect: transitionInspector,
        id,
      });
    }

    // @ts-expect-error internal
    const {idMap} = this.runner.defaultActorLogic;
    if (!idMap.has(source)) {
      throw new Error(`Unknown state ID (source): ${source}`);
    }
    if (!idMap.has(target)) {
      throw new Error(`Unknown state ID (target): ${target}`);
    }

    const p = toPromise(actor);
    actor.start();
    return Object.assign(
      Promise.race([
        p.then(noop, noop),
        scheduler.wait(timeout).then(() => {
          throw new Error(
            `Failed to detect a transition from ${source} to ${target} in ${timeout}ms`,
          );
        }),
      ])
        .then(() => {
          if (!sawTransition) {
            throw new Error(
              `Transition from ${source} to ${target} not detected`,
            );
          }
        })
        .finally(() => {
          actor.stop();
        }),
      actor,
    );
  }
}

export class AnyActorRunner<T extends AnyActorLogic> implements ActorRunner<T> {
  public defaultActorLogic: T;

  public defaultLogger: (...args: any[]) => void;

  public defaultInspector: (evt: InspectionEvent) => void;

  public defaultTimeout: number;

  public defaultId?: string;

  constructor(actorLogic: T, options: ActorRunnerOptions = {}) {
    this.defaultActorLogic = actorLogic;
    this.defaultLogger = options.logger ?? noop;
    this.defaultInspector = options.inspect ?? noop;
    this.defaultTimeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.defaultId = options.id;
  }

  public static create<T extends AnyActorLogic>(
    actorLogic: T,
    options?: ActorRunnerOptions,
  ): AnyActorRunner<T> {
    return new AnyActorRunner(actorLogic, options);
  }

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param input Actor input
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  public runUntilDone(
    input: InputFrom<T> | Actor<T>,
    options?: ActorRunnerOptions,
  ): ActorPromise<T, OutputFrom<T>>;

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param actor Actor
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */

  public runUntilDone(
    actor: Actor<T>,
    options?: ActorRunnerOptionsWithActor,
  ): ActorPromise<T, OutputFrom<T>>;

  @bind()
  public runUntilDone(
    input: InputFrom<T> | Actor<T>,
    options: ActorRunnerOptions = {},
  ): ActorPromise<T, OutputFrom<T>> {
    let actor: Actor<T>;

    const {timeout = this.defaultTimeout} = options;

    if (input instanceof Actor) {
      const {logger = this.defaultLogger, inspect = this.defaultInspector} =
        options as ActorRunnerOptionsWithActor;
      actor = input;
      if (inspect !== this.defaultInspector) {
        actor.system.inspect(toObserver(inspect));
      }
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
    } else {
      const {
        logger = this.defaultLogger,
        inspect = this.defaultInspector,
        id = this.defaultId,
      } = options;
      actor = createActor(this.defaultActorLogic, {
        id,
        input,
        logger,
        inspect,
      });
    }

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
  }

  /**
   * Starts the actor and returns the {@link Actor} object.
   *
   * @param input Actor input
   * @param options Options
   * @returns The {@link Actor} itself
   */
  public start(
    input: InputFrom<T>,
    options?: Omit<ActorRunnerOptions, 'timeout'>,
  ): Actor<T>;
  public start(
    actor: Actor<T>,
    options?: Omit<ActorRunnerOptionsWithActor, 'timeout'>,
  ): Actor<T>;
  @bind()
  public start(
    input: InputFrom<T> | Actor<T>,
    options: Omit<
      ActorRunnerOptions | ActorRunnerOptionsWithActor,
      'timeout'
    > = {},
  ): Actor<T> {
    let actor: Actor<T>;
    if (input instanceof Actor) {
      const {logger = this.defaultLogger, inspect = this.defaultInspector} =
        options as ActorRunnerOptionsWithActor;
      actor = input;
      if (inspect !== this.defaultInspector) {
        actor.system.inspect(toObserver(inspect));
      }
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
    } else {
      const {
        logger = this.defaultLogger,
        inspect = this.defaultInspector,
        id = this.defaultId,
      } = options as ActorRunnerOptions;
      actor = createActor(this.defaultActorLogic, {
        id,
        input,
        logger,
        inspect,
      });
    }
    return actor.start();
  }

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
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
   */
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: InputFrom<T>,
    options?: OptionsWithoutInspect<ActorRunnerOptions>,
  ): ActorPromise<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link Actor} so that events may
   * be sent to the actor.
   *
   * Immediately stops the machine thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param actor Actor
   * @param options Options
   * @returns An {@link ActorPromise} which fulfills with the matching events
   *   (assuming they all occurred in order)
   * @todo See if we cannot distinguish between emitted events, sent events,
   *   etc., at runtime. This would prevent the need to blindly subscribe and
   *   use the inspector at the same time.
   */
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    actor: Actor<T>,
    options?: OptionsWithoutInspect<ActorRunnerOptionsWithActor>,
  ): ActorPromise<T, ActorEventTuple<T, EventTypes>>;

  @bind()
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: InputFrom<T> | Actor<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    > = {},
  ): ActorPromise<T, ActorEventTuple<T, EventTypes>> {
    const expectedEventQueue = [...events];

    if (!expectedEventQueue.length) {
      throw new TypeError('Expected one or more event types');
    }

    // inspector fields events sent to another actor
    const runUntilEventInspector = (evt: InspectionEvent) => {
      const type = expectedEventQueue[0];
      if (evt.type === '@xstate.event' && type === evt.event.type) {
        if (evt.sourceRef === actor) {
          emitted.push(evt.event as EventFromEventType<T, typeof type>);
          expectedEventQueue.shift();
          if (!expectedEventQueue.length) {
            actor.stop();
          }
          subscription?.unsubscribe();
        }
      }
    };
    let actor: Actor<T>;
    if (input instanceof Actor) {
      actor = input;
      const {logger = this.defaultLogger} =
        options as OptionsWithoutInspect<ActorRunnerOptionsWithActor>;
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
      actor.system.inspect(toObserver(runUntilEventInspector));
    } else {
      const {id = this.defaultId, logger = this.defaultLogger} =
        options as OptionsWithoutInspect<ActorRunnerOptions>;
      actor = createActor(this.defaultActorLogic, {
        input,
        id,
        logger,
        inspect: runUntilEventInspector,
      });
    }

    const emitted: ActorEventTuple<T, EventTypes> = [] as any;

    const {timeout = this.defaultTimeout} = options;

    let subscription: Subscription | undefined;

    // subscription fields emitted events
    const subscribe = (type: EventTypes[number]) => {
      subscription = actor.on(type, (evt) => {
        subscription?.unsubscribe();
        emitted.push(evt.event as EventFromEventType<T, typeof type>);
        expectedEventQueue.shift();
        if (!expectedEventQueue.length) {
          actor.stop();
        } else {
          subscription = subscribe(expectedEventQueue[0]);
        }
      });
      return subscription;
    };

    subscription = subscribe(expectedEventQueue[0]);

    const p = toPromise(actor);
    actor.start();
    return Object.assign(
      Promise.race([
        p,
        scheduler.wait(timeout).then(() => {
          const event = expectedEventQueue[0];
          if (event) {
            throw new Error(`Event not sent in ${timeout} ms: ${event}`);
          }
          throw new Error(
            `All events sent in order, but machine timed out in ${timeout}ms`,
          );
        }),
      ])
        .then(() => {
          if (expectedEventQueue.length === 1) {
            throw new Error(
              `Event not sent nor emitted: ${expectedEventQueue[0]}`,
            );
          }
          if (expectedEventQueue.length > 1) {
            throw new Error(
              `Events not sent nor emitted: ${expectedEventQueue.join(', ')}`,
            );
          }
          return emitted;
        })
        .finally(() => {
          subscription?.unsubscribe();
          actor.stop();
        }),
      actor,
    );
  }

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
  public runUntilSnapshot(
    predicate: (snapshot: SnapshotFrom<T>) => boolean,
    input: InputFrom<T>,
    options?: ActorRunnerOptions,
  ): ActorPromise<T, SnapshotFrom<T>>;

  /**
   * Runs a machine until the snapshot predicate returns `true`.
   *
   * Immediately stops the machine thereafter.
   *
   * Returns a combination of a `Promise` and an {@link Actor} so that events may
   * be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link waitFor}
   * @param input Actor
   * @param options Options
   * @returns {@link ActorPromise} Fulfilling with the snapshot that matches the
   *   predicate
   */
  public runUntilSnapshot(
    predicate: (snapshot: SnapshotFrom<T>) => boolean,
    actor: Actor<T>,
    options?: ActorRunnerOptionsWithActor,
  ): ActorPromise<T, SnapshotFrom<T>>;

  @bind()
  public runUntilSnapshot(
    predicate: (snapshot: SnapshotFrom<T>) => boolean,
    input: InputFrom<T> | Actor<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsWithActor = {},
  ): ActorPromise<T, SnapshotFrom<T>> {
    let actor: Actor<T>;

    const {timeout = this.defaultTimeout} = options;

    if (input instanceof Actor) {
      actor = input;
      const {logger = this.defaultLogger, inspect = this.defaultInspector} =
        options as ActorRunnerOptionsWithActor;
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
      if (inspect !== this.defaultInspector) {
        actor.system.inspect(toObserver(inspect));
      }
    } else {
      const {
        logger = this.defaultLogger,
        inspect = this.defaultInspector,
        id = this.defaultId,
      } = options as ActorRunnerOptions;
      actor = this.start(input, {logger, inspect, id});
    }

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
  }

  /**
   * A function that waits for an actor to be spawned.
   *
   * @param actorId A string or RegExp to match against the actor ID
   * @param input Actor input or an {@link Actor}
   * @param options Options
   * @returns The `ActorRef` of the spawned actor
   */
  @bind()
  waitForActor<SpawnedActor extends AnyActorLogic = AnyActorLogic>(
    actorId: string | RegExp,
    input: InputFrom<T> | Actor<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsWithActor = {},
  ): ActorPromise<T, ActorRefFrom<SpawnedActor>> {
    const predicate =
      typeof actorId === 'string'
        ? (id: string) => id === actorId
        : (id: string) => actorId.test(id);

    let actor: Actor<T>;

    const {timeout = this.defaultTimeout} = options;

    if (input instanceof Actor) {
      actor = input;
      const {logger = this.defaultLogger, inspect = this.defaultInspector} =
        options as ActorRunnerOptionsWithActor;
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
      if (inspect !== this.defaultInspector) {
        actor.system.inspect(toObserver(inspect));
      }
    } else {
      const {
        logger = this.defaultLogger,
        inspect = this.defaultInspector,
        id = this.defaultId,
      } = options as ActorRunnerOptions;
      actor = this.start(input, {logger, inspect, id});
    }

    return Object.assign(
      Promise.race([
        new Promise<ActorRefFrom<SpawnedActor>>((resolve) => {
          actor.system.inspect(
            toObserver((evt) => {
              if (evt.type === '@xstate.actor' && predicate(evt.actorRef.id)) {
                resolve(evt.actorRef as ActorRefFrom<SpawnedActor>);
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
  }
}

export interface ActorRunner<T extends AnyActorLogic> {
  defaultActorLogic: T;
  defaultLogger: (...args: any[]) => void;
  defaultInspector: (evt: InspectionEvent) => void;
  defaultTimeout: number;
  defaultId?: string;
  runUntilDone(input: InputFrom<T> | Actor<T>): ActorPromise<T, OutputFrom<T>>;
  start(input: InputFrom<T> | Actor<T>): Actor<T>;
  runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: InputFrom<T> | Actor<T>,
  ): ActorPromise<T, ActorEventTuple<T, EventTypes>>;
  runUntilSnapshot(
    predicate: (snapshot: SnapshotFrom<T>) => boolean,
    input: InputFrom<T> | Actor<T>,
  ): ActorPromise<T, SnapshotFrom<T>>;
  waitForActor<SpawnedActor extends AnyActorLogic = AnyActorLogic>(
    actorId: string | RegExp,
    input: InputFrom<T> | Actor<T>,
  ): ActorPromise<T, ActorRefFrom<SpawnedActor>>;
}

export function createActorRunner<T extends AnyStateMachine>(
  stateMachine: T,
  options?: ActorRunnerOptions,
): StateMachineRunner<T>;

export function createActorRunner<T extends AnyActorLogic>(
  actorLogic: T,
  options?: ActorRunnerOptions,
): AnyActorRunner<T>;

export function createActorRunner<T extends AnyActorLogic | AnyStateMachine>(
  actorLogic: T,
  options?: ActorRunnerOptions,
) {
  if (isStateMachine(actorLogic)) {
    const runner = AnyActorRunner.create(actorLogic, options);
    return new StateMachineRunner(runner);
  }
  return AnyActorRunner.create(actorLogic, options);
}

/**
 * Type guard to determine if some actor logic is a state machine
 *
 * @param actorLogic Any actor logic
 * @returns `true` if `actorLogic` is a state machine
 */
export function isStateMachine<T extends AnyActorLogic>(
  actorLogic: T,
): actorLogic is T & AnyStateMachine {
  return actorLogic instanceof StateMachine;
}

/**
 * That's a no-op, folks
 */
const noop = () => {};

/**
 * Default timeout (in ms) for any of the "run until" methods in
 * {@link AnyActorRunner}
 */
const DEFAULT_TIMEOUT = 1000;
