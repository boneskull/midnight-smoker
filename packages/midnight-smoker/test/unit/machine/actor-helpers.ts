/**
 * Utilities for testing `xstate` (v5) actors in Node.js
 *
 * @license Apache-2.0 https://apache.org/licenses/LICENSE-2.0
 * @author <boneskull@boneskull.com>
 */
import {scheduler} from 'node:timers/promises';
import * as xs from 'xstate';

/**
 * Any event or emitted-event from an actor
 */
export type ActorEvent<T extends xs.AnyActorLogic> =
  | xs.EventFromLogic<T>
  | xs.EmittedFrom<T>;

/**
 * A tuple of events emitted by an actor, based on a {@link ActorEventTypeTuple}
 *
 * @see {@link AnyActorRunner.runUntilEvent}
 */
export type ActorEventTuple<
  T extends xs.AnyActorLogic,
  EventTypes extends ActorEventTypeTuple<T>,
> = {[K in keyof EventTypes]: EventFromEventType<T, EventTypes[K]>};

/**
 * The `type` prop of any event or emitted event from an actor
 */
export type ActorEventType<T extends xs.AnyActorLogic> = ActorEvent<T>['type'];

/**
 * A tuple of event types (event names) emitted by an actor
 *
 * @see {@link AnyActorRunner.runUntilEvent}
 */
export type ActorEventTypeTuple<T extends xs.AnyActorLogic> = [
  ActorEventType<T>,
  ...ActorEventType<T>,
];

/**
 * Options for methods in {@link AnyActorRunner}
 */
export type ActorRunnerOptions = {
  /**
   * Default actor ID to use
   */
  id?: string;

  /**
   * Default inspector to use
   *
   * @param An {@link xs.InspectionEvent InspectionEvent}
   */
  inspect?: (evt: xs.InspectionEvent) => void;

  /**
   * Default logger to use
   *
   * @param Anything To be logged
   */
  logger?: (...args: any[]) => void;

  /**
   * Default timeout for those methods which accept a timeout.
   */
  timeout?: number;
};

/**
 * Options in {@link ActorRunner} methods where an existing {@link Actor} is
 * provided instead of input for a new `Actor`.
 *
 * These methods cannot and should not overwrite an existing actor's ID.
 */
export type ActorRunnerOptionsWithActor = Omit<ActorRunnerOptions, 'id'>;

/**
 * Frankenpromise that is both a `Promise` and an {@link xs.Actor}.
 *
 * Returned by some methods in {@link AnyActorRunner}
 */
export type ActorThenable<
  T extends xs.AnyActorLogic,
  Out = void,
> = Promise<Out> & xs.Actor<T>;

/**
 * Lookup for event/emitted-event based on type
 */
export type EventFromEventType<
  T extends xs.AnyActorLogic,
  K extends ActorEventType<T>,
> = xs.ExtractEvent<ActorEvent<T>, K>;

/**
 * Options for methods in {@link AnyActorRunner} which provide their own
 * inspection callbacks, and thus do allow custom inspectors.
 */
export type OptionsWithoutInspect<T extends ActorRunnerOptions> = Omit<
  T,
  'inspect'
>;

export interface ActorRunner<T extends xs.AnyActorLogic> {
  /**
   * Default actor logic to use
   */
  defaultActorLogic: T;

  /**
   * Default actor ID to use when creating an actor.
   */
  defaultId?: string;

  /**
   * Default inspector to use.
   */
  defaultInspector: (evt: xs.InspectionEvent) => void;

  /**
   * Default logger
   */
  defaultLogger: (...args: any[]) => void;

  /**
   * Default timeout for those methods which accept a timeout.
   */
  defaultTimeout: number;

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  runUntilDone(
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorThenable<T, xs.OutputFrom<T>>;

  /**
   * Runs an actor (or starts a new one) until it emits or sends one or more
   * events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * Immediately stops the actor thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorThenable<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor until the snapshot predicate returns `true`.
   *
   * Immediately stops the actor thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Starts an actor, applying defaults, and returns the {@link xs.Actor} object.
   *
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns The {@link xs.Actor} itself
   */
  start(input: xs.InputFrom<T> | xs.Actor<T>): xs.Actor<T>;

  /**
   * Waits for an actor to be spawned.
   *
   * "Actor" here refers to _some other actor_--not the actor provided via
   * `input` nor created from the input object.
   *
   * Does **not** stop the root actor.
   *
   * @param actorId A string or RegExp to match against the actor ID
   * @param input Actor input or an {@link xs.Actor}
   * @param options Options
   * @returns The `ActorRef` of the spawned actor
   */
  waitForActor<SpawnedActor extends xs.AnyActorLogic = xs.AnyActorLogic>(
    actorId: string | RegExp,
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorThenable<T, xs.ActorRefFrom<SpawnedActor>>;

  /**
   * Runs a new or existing actor until the snapshot predicate returns `true`.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  waitForSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;
}

/**
 * An {@link ActorRunner} which provides additional methods for testing state
 * machines
 */
export interface StateMachineActorRunner<T extends xs.AnyStateMachine>
  extends ActorRunner<T> {
  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Immediately stops the machine thereafter. Returns a combination of a
   * `Promise` and an {@link xs.Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param opts Options
   * @returns An {@link ActorThenable} that resolves when the specified
   *   transition occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   */
  runUntilTransition(
    source: string,
    target: string,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options?: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    >,
  ): ActorThenable<T>;

  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Useful for chaining transitions--but keep in mind that actions are executed
   * synchronously!
   *
   * **Does not stop the machine**. Returns a combination of a `Promise` and an
   * {@link xs.Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Machine input
   * @param opts Options
   * @returns An {@link ActorThenable} that resolves when the specified
   *   transition occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   */
  waitForTransition(
    source: string,
    target: string,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options?: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    >,
  ): ActorThenable<T>;
}

/**
 * An implementation of an {@link ActorRunner} which can help test any actor
 * logic.
 */
export class AnyActorRunner<T extends xs.AnyActorLogic>
  implements ActorRunner<T>
{
  /**
   * Used to generate unique actor IDs when no ID is otherwise provided.
   *
   * Incremented when {@link getActorId} cannot otherwise find an ID.
   *
   * @internal
   */
  public static anonymousActorIndex = 0;

  /**
   * Default actor logic to use
   */
  public defaultActorLogic: T;

  /**
   * Default actor ID to use when creating an actor.
   */
  public defaultId?: string;

  /**
   * Default inspector to use.
   */
  public defaultInspector: (evt: xs.InspectionEvent) => void;

  /**
   * Default logger
   */
  public defaultLogger: (...args: any[]) => void;

  /**
   * Default timeout for those methods which accept a timeout.
   */
  public defaultTimeout: number;

  /**
   * If `actorLogic` is a state machine, it will use the machine's default ID
   * (if present) as {@link AnyActorRunner.defaultId} _unless_
   * {@link ActorRunnerOptions.id} is provided in `options`.
   *
   * @param actorLogic Any actor logic
   * @param options Options
   */
  constructor(
    actorLogic: T,
    {
      id: defaultId,
      logger: defaultLogger = noop,
      inspect: defaultInspector = noop,
      timeout: defaultTimeout = DEFAULT_TIMEOUT,
    }: ActorRunnerOptions = {},
  ) {
    this.defaultActorLogic = actorLogic;
    this.defaultLogger = defaultLogger;
    this.defaultInspector = defaultInspector;
    this.defaultTimeout = defaultTimeout;
    this.defaultId = defaultId;

    // State machines _may_ have a default ID
    if (!this.defaultId && actorLogic instanceof xs.StateMachine) {
      this.defaultId = actorLogic.id;
    }
  }

  /**
   * Factory function for creating a {@link AnyActorRunner}.
   *
   * @param actorLogic Any actor logic
   * @param options Options
   * @returns A new instance of {@link AnyActorRunner}
   */
  public static create<T extends xs.AnyActorLogic>(
    actorLogic: T,
    options?: ActorRunnerOptions,
  ): AnyActorRunner<T> {
    return new AnyActorRunner(actorLogic, options);
  }

  /**
   * Creates an {@link ActorThenable} from an {@link Actor} and a {@link Promise}.
   *
   * @param actor An `Actor`
   * @param promise Any `Promise`
   * @returns An `Actor` which is also a thenable
   * @internal
   */
  public static createActorThenable<T extends xs.AnyActorLogic, Out = void>(
    actor: xs.Actor<T>,
    promise: Promise<Out>,
  ): ActorThenable<T, Out> {
    // there are myriad ways to do this, and here is one.
    const pThen = promise.then.bind(promise);
    const pCatch = promise.catch.bind(promise);
    const pFinally = promise.finally.bind(promise);
    return new Proxy(actor, {
      get: (target, prop, receiver) => {
        switch (prop) {
          case 'then':
            return pThen;
          case 'catch':
            return pCatch;
          case 'finally':
            return pFinally;
          default:
            return Reflect.get(target, prop, receiver);
        }
      },
    }) as ActorThenable<T, Out>;
  }

  /**
   * Creates a new `Actor` from the actor logic and the provided input. Assigns
   * default or provided `id`, logger and inspector.
   *
   * @param input Input for actor logic
   * @param options Options for {@link xs.createActor}, mostly
   * @returns New actor (not started)
   * @internal
   */
  public createInstrumentedActor(
    input: xs.InputFrom<T>,
    options: ActorRunnerOptions,
  ): xs.Actor<T> {
    const {
      logger = this.defaultLogger,
      inspect = this.defaultInspector,
      id = this.defaultId,
    } = options;
    return xs.createActor(this.defaultActorLogic, {
      id,
      input,
      logger,
      inspect,
    });
  }

  /**
   * Gets an actor ID for a new actor or from an existing actor.
   *
   * If one is otherwise unavailable, a unique ID will be generated matching
   * `^__ActorHelpers-\d+__$`.
   *
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param id ID, if any
   * @returns A unique ID
   * @internal
   */
  public getActorId<T extends xs.AnyActorLogic>(
    input: xs.InputFrom<T> | xs.Actor<T>,
    id = this.defaultId,
  ): string {
    return input instanceof xs.Actor
      ? input.id
      : id ?? `__ActorHelpers-${AnyActorRunner.anonymousActorIndex++}__`;
  }

  /**
   * Sets up an existing `Actor` with a logger and inspector.
   *
   * @param actor Actor
   * @param options Options for instrumentation
   * @returns Instrumented actor
   * @internal
   */
  public instrumentActor(
    actor: xs.Actor<T>,
    options: ActorRunnerOptionsWithActor,
  ): xs.Actor<T> {
    const {logger = this.defaultLogger, inspect = this.defaultInspector} =
      options;
    if (inspect !== this.defaultInspector) {
      actor.system.inspect(xs.toObserver(inspect));
    }
    if (logger !== this.defaultLogger) {
      // @ts-expect-error private
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      actor.logger = actor._actorScope.logger = logger;
    }
    return actor;
  }

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param input Actor input
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  public runUntilDone(
    input: xs.InputFrom<T> | xs.Actor<T>,
    options?: ActorRunnerOptions,
  ): ActorThenable<T, xs.OutputFrom<T>>;

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param actor Actor
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  public runUntilDone(
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsWithActor,
  ): ActorThenable<T, xs.OutputFrom<T>>;

  /**
   * Runs an actor to completion (or timeout) and fulfills with its output.
   *
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns `Promise` fulfilling with the actor output
   */
  @bind()
  public runUntilDone(
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsWithActor = {},
  ): ActorThenable<T, xs.OutputFrom<T>> {
    const {timeout = this.defaultTimeout} = options;

    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsWithActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    // order is important: create promise, then start.
    const p = xs.toPromise(actor);
    actor.start();
    const ac = new AbortController();
    return AnyActorRunner.createActorThenable(
      actor,
      Promise.race([
        p.finally(() => {
          ac.abort();
        }),
        scheduler.wait(timeout, {signal: ac.signal}).then(() => {
          throw new Error(`Actor did not complete in ${timeout}ms`);
        }),
      ]),
    );
  }

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * Immediately stops the actor thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Actor input
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: xs.InputFrom<T>,
    options?: OptionsWithoutInspect<ActorRunnerOptions>,
  ): ActorThenable<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * Immediately stops the actor thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param actor Actor
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   * @todo See if we cannot distinguish between emitted events, sent events,
   *   etc., at runtime. This would prevent the need to blindly subscribe and
   *   use the inspector at the same time.
   */
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    actor: xs.Actor<T>,
    options?: OptionsWithoutInspect<ActorRunnerOptionsWithActor>,
  ): ActorThenable<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor (or starts a new one) until it emits or sends one or more
   * events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * Immediately stops the actor thereafter.
   *
   * @param events One or more _event names_ (the `type` field) to wait for (in
   *   order)
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns An {@link ActorThenable} which fulfills with the matching events
   *   (assuming they all occurred in order)
   */
  @bind()
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    > = {},
  ): ActorThenable<T, ActorEventTuple<T, EventTypes>> {
    const expectedEventQueue = [...events];

    if (!expectedEventQueue.length) {
      throw new TypeError('Expected one or more event types');
    }
    const id = this.getActorId(
      input,
      (options as OptionsWithoutInspect<ActorRunnerOptions>).id,
    );

    // inspector fields events sent to another actor
    const runUntilEventInspector = (evt: xs.InspectionEvent) => {
      const type = expectedEventQueue[0];
      if (evt.type === '@xstate.event' && type === evt.event.type) {
        if (evt.sourceRef?.id === id) {
          emitted.push(evt.event as EventFromEventType<T, typeof type>);
          expectedEventQueue.shift();
          if (!expectedEventQueue.length) {
            evt.sourceRef.stop();
          }
          subscription?.unsubscribe();
        }
      }
    };

    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, {
            ...options,
            inspect: runUntilEventInspector,
          } as ActorRunnerOptionsWithActor)
        : this.createInstrumentedActor(input, {
            ...options,
            inspect: runUntilEventInspector,
          } as ActorRunnerOptions);

    const emitted: ActorEventTuple<T, EventTypes> = [] as any;

    const {timeout = this.defaultTimeout} = options;

    let subscription: xs.Subscription | undefined;

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

    const p = xs.toPromise(actor);
    actor.start();
    const ac = new AbortController();
    return AnyActorRunner.createActorThenable(
      actor,
      Promise.race([
        p.finally(() => {
          ac.abort();
        }),
        scheduler.wait(timeout, {signal: ac.signal}).then(() => {
          const event = expectedEventQueue[0];
          if (event) {
            throw new Error(`Event not sent in ${timeout} ms: ${event}`);
          }
          throw new Error(
            `All events sent in order, but actor timed out in ${timeout}ms`,
          );
        }),
      ])
        .then(() => {
          if (expectedEventQueue.length) {
            throw new Error(
              `Event(s) not sent nor emitted: ${expectedEventQueue.join(', ')}`,
            );
          }
          return emitted;
        })
        .finally(() => {
          subscription?.unsubscribe();
          actor.stop();
        }),
    );
  }

  /**
   * Runs a actor until the snapshot predicate returns `true`.
   *
   * Immediately stops the actor thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor input
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptions,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Runs a actor until the snapshot predicate returns `true`.
   *
   * Immediately stops the actor thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsWithActor,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Runs an actor until the snapshot predicate returns `true`.
   *
   * Immediately stops the actor thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  @bind()
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsWithActor = {},
  ): ActorThenable<T, xs.SnapshotFrom<T>> {
    const {timeout = this.defaultTimeout} = options;

    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsWithActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    actor.start();

    return AnyActorRunner.createActorThenable(
      actor,
      xs
        .waitFor(actor, predicate, {timeout})
        .catch((err) => {
          if (err instanceof Error) {
            if (err.message.startsWith('Timeout of')) {
              throw new Error(
                `Snapshot did not match predicate in ${timeout}ms`,
              );
            } else if (
              err.message.startsWith(
                'Actor terminated without satisfying predicate',
              )
            ) {
              throw new Error(`Actor stopped without satisfying predicate`);
            }
          }
          throw err;
        })
        .finally(() => {
          actor.stop();
        }),
    );
  }

  /**
   * Starts the actor and returns the {@link xs.Actor} object.
   *
   * @param input Actor input
   * @param options Options
   * @returns The {@link xs.Actor} itself
   */
  public start(
    input: xs.InputFrom<T>,
    options?: Omit<ActorRunnerOptions, 'timeout'>,
  ): xs.Actor<T>;
  public start(
    actor: xs.Actor<T>,
    options?: Omit<ActorRunnerOptionsWithActor, 'timeout'>,
  ): xs.Actor<T>;
  @bind()
  public start(
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: Omit<
      ActorRunnerOptions | ActorRunnerOptionsWithActor,
      'timeout'
    > = {},
  ): xs.Actor<T> {
    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsWithActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);
    return actor.start();
  }

  /**
   * A function that waits for an actor to be spawned.
   *
   * Does **not** stop the root actor.
   *
   * @param actorId A string or RegExp to match against the actor ID
   * @param input Actor input or an {@link xs.Actor}
   * @param options Options
   * @returns The `ActorRef` of the spawned actor
   */
  @bind()
  public waitForActor<SpawnedActor extends xs.AnyActorLogic = xs.AnyActorLogic>(
    actorId: string | RegExp,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsWithActor = {},
  ): ActorThenable<T, xs.ActorRefFrom<SpawnedActor>> {
    const predicate =
      typeof actorId === 'string'
        ? (id: string) => id === actorId
        : (id: string) => actorId.test(id);

    const {timeout = this.defaultTimeout} = options;
    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsWithActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    actor.start();

    const ac = new AbortController();

    return Object.assign(
      Promise.race([
        new Promise<xs.ActorRefFrom<SpawnedActor>>((resolve) => {
          actor.system.inspect(
            xs.toObserver((evt) => {
              if (evt.type === '@xstate.actor' && predicate(evt.actorRef.id)) {
                resolve(evt.actorRef as xs.ActorRefFrom<SpawnedActor>);
              }
            }),
          );
        }).finally(() => {
          ac.abort();
        }),
        scheduler.wait(timeout, {signal: ac.signal}).then(() => {
          throw new Error(
            `Failed to detect an spawned actor matching ${actorId} in ${timeout}ms`,
          );
        }),
      ]),
      actor,
    );
  }

  /**
   * Runs a actor until the snapshot predicate returns `true`.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor input
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  public waitForSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptions,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Runs a actor until the snapshot predicate returns `true`.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  public waitForSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsWithActor,
  ): ActorThenable<T, xs.SnapshotFrom<T>>;

  /**
   * Runs a new or existing actor until the snapshot predicate returns `true`.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Input for {@link defaultActorLogic} or an existing {@link Actor}
   * @param options Options
   * @returns {@link ActorThenable} Fulfilling with the snapshot that matches
   *   the predicate
   */
  @bind()
  public waitForSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsWithActor = {},
  ): ActorThenable<T, xs.SnapshotFrom<T>> {
    const {timeout = this.defaultTimeout} = options;

    const actor =
      input instanceof xs.Actor
        ? this.instrumentActor(input, options as ActorRunnerOptionsWithActor)
        : this.createInstrumentedActor(input, options as ActorRunnerOptions);

    actor.start();

    return AnyActorRunner.createActorThenable(
      actor,
      xs.waitFor(actor, predicate, {timeout}).catch((err) => {
        if (err instanceof Error) {
          if (err.message.startsWith('Timeout of')) {
            throw new Error(`Snapshot did not match predicate in ${timeout}ms`);
          } else if (
            err.message.startsWith(
              'Actor terminated without satisfying predicate',
            )
          ) {
            throw new Error(`Actor stopped before satisfying predicate`);
          }
        }
        throw err;
      }),
    );
  }
}

/**
 * Helpers for testing state machine behavior
 *
 * @remarks
 * Just a wrapper around {@link AnyActorRunner}
 * @template T `StateMachine` actor logic
 */
export class StateMachineRunner<T extends xs.AnyStateMachine>
  implements StateMachineActorRunner<T>
{
  constructor(public readonly runner: AnyActorRunner<T>) {}

  /**
   * {@inheritDoc AnyActorRunner.defaultActorLogic}
   */
  public get defaultActorLogic() {
    return this.runner.defaultActorLogic;
  }

  /**
   * {@inheritDoc AnyActorRunner.defaultId}
   */
  public get defaultId() {
    return this.runner.defaultId;
  }

  /**
   * {@inheritDoc AnyActorRunner.defaultInspector}
   */
  public get defaultInspector() {
    return this.runner.defaultInspector;
  }

  /**
   * {@inheritDoc AnyActorRunner.defaultLogger}
   */
  public get defaultLogger() {
    return this.runner.defaultLogger;
  }

  /**
   * {@inheritDoc AnyActorRunner.defaultTimeout}
   */
  public get defaultTimeout() {
    return this.runner.defaultTimeout;
  }

  /**
   * {@inheritDoc AnyActorRunner.runUntilDone}
   */
  public get runUntilDone() {
    return this.runner.runUntilDone;
  }

  /**
   * {@inheritDoc AnyActorRunner.runUntilEvent}
   */
  public get runUntilEvent() {
    return this.runner.runUntilEvent;
  }

  /**
   * {@inheritDoc AnyActorRunner.runUntilSnapshot}
   */
  public get runUntilSnapshot() {
    return this.runner.runUntilSnapshot;
  }

  /**
   * {@inheritDoc AnyActorRunner.start}
   */
  public get start() {
    return this.runner.start;
  }

  /**
   * {@inheritDoc AnyActorRunner.waitForActor}
   */
  public get waitForActor() {
    return this.runner.waitForActor;
  }

  /**
   * {@inheritDoc AnyActorRunner.waitForSnapshot}
   */
  public get waitForSnapshot() {
    return this.runner.waitForSnapshot;
  }

  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Immediately stops the machine thereafter. Returns a combination of a
   * `Promise` and an {@link xs.Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Machine input
   * @param opts Options
   * @returns An {@link ActorThenable} that resolves when the specified
   *   transition occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   *
   * @todo Attempt to reuse {@link waitUntilTransition}
   */
  @bind()
  public runUntilTransition(
    source: string,
    target: string,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    > = {},
  ): ActorThenable<T> {
    const {timeout = this.defaultTimeout} = options;
    let sawTransition = false;

    /**
     * We need the actor ID here so we can match against it in the inspector.
     * However, we don't necessarily have an actor yet, and the inspector may
     * fire _before_ we do (think: initial transition). But we also don't want
     * to miss anything, so we need to generate an ID unless one is otherwise
     * provided.
     */
    const id = this.runner.getActorId(
      input,
      (options as OptionsWithoutInspect<ActorRunnerOptions>).id,
    );

    const transitionInspector = (evt: xs.InspectionEvent) => {
      if (evt.type === '@xstate.microstep') {
        if (evt.actorRef.id === id) {
          if (
            evt._transitions.some(
              (tDef) =>
                tDef.source.id === source &&
                tDef.target?.some((t) => t.id === target),
            )
          ) {
            sawTransition = true;
          }
        }
      }
    };

    const actor =
      input instanceof xs.Actor
        ? this.runner.instrumentActor(input, {
            ...options,
            inspect: transitionInspector,
          } as ActorRunnerOptionsWithActor)
        : this.runner.createInstrumentedActor(input, {
            ...options,
            id,
            inspect: transitionInspector,
          } as ActorRunnerOptions);

    // @ts-expect-error internal
    const {idMap} = this.runner.defaultActorLogic;
    if (!idMap.has(source)) {
      throw new Error(`Unknown state ID (source): ${source}`);
    }
    if (!idMap.has(target)) {
      throw new Error(`Unknown state ID (target): ${target}`);
    }

    const p = xs.toPromise(actor);
    const ac = new AbortController();
    actor.start();
    return AnyActorRunner.createActorThenable(
      actor,
      Promise.race([
        p.then(noop, noop).finally(() => {
          ac.abort();
        }),
        scheduler.wait(timeout, {signal: ac.signal}).then(() => {
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
    );
  }

  /**
   * Runs the machine until a transition from the `source` state to the `target`
   * state occurs.
   *
   * Useful for chaining transitions--but keep in mind that actions are executed
   * synchronously!
   *
   * **Does not stop the machine**. Returns a combination of a `Promise` and an
   * {@link xs.Actor} so that events may be sent to the actor.
   *
   * @param source Source state ID
   * @param target Target state ID
   * @param input Machine input
   * @param opts Options
   * @returns An {@link ActorThenable} that resolves when the specified
   *   transition occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   */
  @bind()
  public waitForTransition(
    source: string,
    target: string,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    > = {},
  ): ActorThenable<T> {
    const {timeout = this.defaultTimeout} = options;
    let sawTransition = false;

    /**
     * We need the actor ID here so we can match against it in the inspector.
     * However, we don't necessarily have an actor yet, and the inspector may
     * fire _before_ we do (think: initial transition). But we also don't want
     * to miss anything, so we need to generate an ID unless one is otherwise
     * provided.
     */
    const id = this.runner.getActorId(
      input,
      (options as OptionsWithoutInspect<ActorRunnerOptions>).id,
    );

    const transitionInspector = (evt: xs.InspectionEvent) => {
      if (evt.type === '@xstate.microstep') {
        if (evt.actorRef.id === id) {
          if (
            evt._transitions.some(
              (tDef) =>
                tDef.source.id === source &&
                tDef.target?.some((t) => t.id === target),
            )
          ) {
            sawTransition = true;
            evt.actorRef.stop();
          }
        }
      }
    };

    const actor =
      input instanceof xs.Actor
        ? this.runner.instrumentActor(input, {
            ...options,
            inspect: transitionInspector,
          } as ActorRunnerOptionsWithActor)
        : this.runner.createInstrumentedActor(input, {
            ...options,
            id,
            inspect: transitionInspector,
          } as ActorRunnerOptions);

    // @ts-expect-error internal
    const {idMap} = this.runner.defaultActorLogic;
    if (!idMap.has(source)) {
      throw new Error(`Unknown state ID (source): ${source}`);
    }
    if (!idMap.has(target)) {
      throw new Error(`Unknown state ID (target): ${target}`);
    }

    const p = xs.toPromise(actor);
    const ac = new AbortController();
    actor.start();
    return AnyActorRunner.createActorThenable(
      actor,
      Promise.race([
        p.then(noop, noop).finally(() => {
          ac.abort();
        }),
        scheduler.wait(timeout, {signal: ac.signal}).then(() => {
          throw new Error(
            `Failed to detect a transition from ${source} to ${target} in ${timeout}ms`,
          );
        }),
      ]).then(() => {
        if (!sawTransition) {
          throw new Error(
            `Transition from ${source} to ${target} not detected`,
          );
        }
      }),
    );
  }
}

/**
 * Decorator to bind a class method to a context (defaulting to `this`)
 *
 * @param ctx Alternate context, if needed
 */
export function bind<
  TThis extends object,
  TArgs extends any[] = unknown[],
  TReturn = unknown,
  TContext extends object = TThis,
>(ctx?: TContext) {
  return function (
    target: (this: TThis, ...args: TArgs) => TReturn,
    context: ClassMethodDecoratorContext<
      TThis,
      (this: TThis, ...args: TArgs) => TReturn
    >,
  ) {
    context.addInitializer(function (this: TThis) {
      const func = context.access.get(this);

      // @ts-expect-error FIXME
      this[context.name] = func.bind(ctx ?? this);
    });
  };
}

export function createActorRunner<T extends xs.AnyStateMachine>(
  stateMachine: T,
  options?: ActorRunnerOptions,
): StateMachineRunner<T>;

export function createActorRunner<T extends xs.AnyActorLogic>(
  actorLogic: T,
  options?: ActorRunnerOptions,
): AnyActorRunner<T>;

export function createActorRunner<
  T extends xs.AnyActorLogic | xs.AnyStateMachine,
>(actorLogic: T, options?: ActorRunnerOptions) {
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
export function isStateMachine<T extends xs.AnyActorLogic>(
  actorLogic: T,
): actorLogic is T & xs.AnyStateMachine {
  return actorLogic instanceof xs.StateMachine;
}

/**
 * That's a no-op, folks
 */
const noop = () => {};

/**
 * Default timeout (in ms) for any of the "run until" methods in
 * {@link AnyActorRunner}
 *
 * This must be set to a lower value than the default timeout for the test
 * runner.
 */
const DEFAULT_TIMEOUT = 1000;
