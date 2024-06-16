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
 * Frankenpromise that is both a `Promise` and an {@link xs.Actor}.
 *
 * Returned by some methods in {@link AnyActorRunner}
 */
export type ActorPromise<
  T extends xs.AnyActorLogic,
  Out = void,
> = Promise<Out> & xs.Actor<T>;

export type ActorRunnerOptionsWithActor = Omit<ActorRunnerOptions, 'id'>;

/**
 * Lookup for event/emitted-event based on type
 */
export type EventFromEventType<
  T extends xs.AnyActorLogic,
  K extends ActorEventType<T>,
> = xs.ExtractEvent<ActorEvent<T>, K>;

export type OptionsWithoutInspect<T extends ActorRunnerOptions> = Omit<
  T,
  'inspect'
>;

export interface ActorRunner<T extends xs.AnyActorLogic> {
  defaultActorLogic: T;
  defaultId?: string;
  defaultInspector: (evt: xs.InspectionEvent) => void;
  defaultLogger: (...args: any[]) => void;
  defaultTimeout: number;

  runUntilDone(
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorPromise<T, xs.OutputFrom<T>>;
  runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorPromise<T, ActorEventTuple<T, EventTypes>>;
  runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorPromise<T, xs.SnapshotFrom<T>>;
  start(input: xs.InputFrom<T> | xs.Actor<T>): xs.Actor<T>;
  waitForActor<SpawnedActor extends xs.AnyActorLogic = xs.AnyActorLogic>(
    actorId: string | RegExp,
    input: xs.InputFrom<T> | xs.Actor<T>,
  ): ActorPromise<T, xs.ActorRefFrom<SpawnedActor>>;
}

/**
 * Options for methods in {@link AnyActorRunner}
 */
export interface ActorRunnerOptions {
  /**
   * Default actor ID to use
   */
  id?: string;
  inspect?: (evt: xs.InspectionEvent) => void;
  logger?: (...args: any[]) => void;
  timeout?: number;
}

export class AnyActorRunner<T extends xs.AnyActorLogic>
  implements ActorRunner<T>
{
  public defaultActorLogic: T;

  public defaultId?: string;

  public defaultInspector: (evt: xs.InspectionEvent) => void;

  public defaultLogger: (...args: any[]) => void;

  public defaultTimeout: number;

  constructor(actorLogic: T, options: ActorRunnerOptions = {}) {
    this.defaultActorLogic = actorLogic;
    this.defaultLogger = options.logger ?? noop;
    this.defaultInspector = options.inspect ?? noop;
    this.defaultTimeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.defaultId = options.id;
  }

  public static create<T extends xs.AnyActorLogic>(
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
    input: xs.InputFrom<T> | xs.Actor<T>,
    options?: ActorRunnerOptions,
  ): ActorPromise<T, xs.OutputFrom<T>>;

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
  ): ActorPromise<T, xs.OutputFrom<T>>;
  @bind()
  public runUntilDone(
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: ActorRunnerOptions = {},
  ): ActorPromise<T, xs.OutputFrom<T>> {
    let actor: xs.Actor<T>;

    const {timeout = this.defaultTimeout} = options;

    if (input instanceof xs.Actor) {
      const {logger = this.defaultLogger, inspect = this.defaultInspector} =
        options as ActorRunnerOptionsWithActor;
      actor = input;
      if (inspect !== this.defaultInspector) {
        actor.system.inspect(xs.toObserver(inspect));
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
      actor = xs.createActor(this.defaultActorLogic, {
        id,
        input,
        logger,
        inspect,
      });
    }

    // order is important: create promise, then start.
    const actorPromise = xs.toPromise(actor);
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
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
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
    input: xs.InputFrom<T>,
    options?: OptionsWithoutInspect<ActorRunnerOptions>,
  ): ActorPromise<T, ActorEventTuple<T, EventTypes>>;

  /**
   * Runs an actor until it emits or sends one or more events (in order).
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
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
    actor: xs.Actor<T>,
    options?: OptionsWithoutInspect<ActorRunnerOptionsWithActor>,
  ): ActorPromise<T, ActorEventTuple<T, EventTypes>>;
  @bind()
  public runUntilEvent<const EventTypes extends ActorEventTypeTuple<T>>(
    events: EventTypes,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    > = {},
  ): ActorPromise<T, ActorEventTuple<T, EventTypes>> {
    const expectedEventQueue = [...events];

    if (!expectedEventQueue.length) {
      throw new TypeError('Expected one or more event types');
    }

    // inspector fields events sent to another actor
    const runUntilEventInspector = (evt: xs.InspectionEvent) => {
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
    let actor: xs.Actor<T>;
    if (input instanceof xs.Actor) {
      actor = input;
      const {logger = this.defaultLogger} =
        options as OptionsWithoutInspect<ActorRunnerOptionsWithActor>;
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
      actor.system.inspect(xs.toObserver(runUntilEventInspector));
    } else {
      const {id = this.defaultId, logger = this.defaultLogger} =
        options as OptionsWithoutInspect<ActorRunnerOptions>;
      actor = xs.createActor(this.defaultActorLogic, {
        input,
        id,
        logger,
        inspect: runUntilEventInspector,
      });
    }

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
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor input
   * @param options Options
   * @returns {@link ActorPromise} Fulfilling with the snapshot that matches the
   *   predicate
   */
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T>,
    options?: ActorRunnerOptions,
  ): ActorPromise<T, xs.SnapshotFrom<T>>;

  /**
   * Runs a machine until the snapshot predicate returns `true`.
   *
   * Immediately stops the machine thereafter.
   *
   * Returns a combination of a `Promise` and an {@link xs.Actor} so that events
   * may be sent to the actor.
   *
   * @param predicate Snapshot predicate; see {@link xs.waitFor}
   * @param input Actor
   * @param options Options
   * @returns {@link ActorPromise} Fulfilling with the snapshot that matches the
   *   predicate
   */
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    actor: xs.Actor<T>,
    options?: ActorRunnerOptionsWithActor,
  ): ActorPromise<T, xs.SnapshotFrom<T>>;
  @bind()
  public runUntilSnapshot(
    predicate: (snapshot: xs.SnapshotFrom<T>) => boolean,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: ActorRunnerOptions | ActorRunnerOptionsWithActor = {},
  ): ActorPromise<T, xs.SnapshotFrom<T>> {
    let actor: xs.Actor<T>;

    const {timeout = this.defaultTimeout} = options;

    if (input instanceof xs.Actor) {
      actor = input;
      const {logger = this.defaultLogger, inspect = this.defaultInspector} =
        options as ActorRunnerOptionsWithActor;
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
      if (inspect !== this.defaultInspector) {
        actor.system.inspect(xs.toObserver(inspect));
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
      xs
        .waitFor(actor, predicate, {timeout})
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
    let actor: xs.Actor<T>;
    if (input instanceof xs.Actor) {
      const {logger = this.defaultLogger, inspect = this.defaultInspector} =
        options as ActorRunnerOptionsWithActor;
      actor = input;
      if (inspect !== this.defaultInspector) {
        actor.system.inspect(xs.toObserver(inspect));
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
      actor = xs.createActor(this.defaultActorLogic, {
        id,
        input,
        logger,
        inspect,
      });
    }
    return actor.start();
  }

  /**
   * A function that waits for an actor to be spawned.
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
  ): ActorPromise<T, xs.ActorRefFrom<SpawnedActor>> {
    const predicate =
      typeof actorId === 'string'
        ? (id: string) => id === actorId
        : (id: string) => actorId.test(id);

    let actor: xs.Actor<T>;

    const {timeout = this.defaultTimeout} = options;

    if (input instanceof xs.Actor) {
      actor = input;
      const {logger = this.defaultLogger, inspect = this.defaultInspector} =
        options as ActorRunnerOptionsWithActor;
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
      if (inspect !== this.defaultInspector) {
        actor.system.inspect(xs.toObserver(inspect));
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
        new Promise<xs.ActorRefFrom<SpawnedActor>>((resolve) => {
          actor.system.inspect(
            xs.toObserver((evt) => {
              if (evt.type === '@xstate.actor' && predicate(evt.actorRef.id)) {
                resolve(evt.actorRef as xs.ActorRefFrom<SpawnedActor>);
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

/**
 * Helpers for testing state machine behavior
 *
 * @remarks
 * Just a wrapper around {@link AnyActorRunner}
 * @template T `StateMachine` actor logic
 */
export class StateMachineRunner<T extends xs.AnyStateMachine>
  implements ActorRunner<T>
{
  constructor(public readonly runner: AnyActorRunner<T>) {}

  public get defaultActorLogic() {
    return this.runner.defaultActorLogic;
  }

  public get defaultId() {
    return this.runner.defaultId;
  }

  public get defaultInspector() {
    return this.runner.defaultInspector;
  }

  public get defaultLogger() {
    return this.runner.defaultLogger;
  }

  public get defaultTimeout() {
    return this.runner.defaultTimeout;
  }

  public get runUntilDone() {
    return this.runner.runUntilDone;
  }

  public get runUntilEvent() {
    return this.runner.runUntilEvent;
  }

  public get runUntilSnapshot() {
    return this.runner.runUntilSnapshot;
  }

  public get start() {
    return this.runner.start;
  }

  public get waitForActor() {
    return this.runner.waitForActor;
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
   * @returns An {@link ActorPromise} that resolves when the specified transition
   *   occurs
   * @todo Type narrowing for `source` and `target` once xstate supports it
   */
  @bind()
  public runUntilTransition(
    source: string,
    target: string,
    input: xs.InputFrom<T> | xs.Actor<T>,
    options: OptionsWithoutInspect<
      ActorRunnerOptions | ActorRunnerOptionsWithActor
    > = {},
  ): ActorPromise<T> {
    let actor: xs.Actor<T>;

    const {timeout = this.defaultTimeout} = options;
    let sawTransition = false;
    const transitionInspector = (evt: xs.InspectionEvent) => {
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

    if (input instanceof xs.StateMachine) {
      actor = input;
      const {logger = this.defaultLogger} =
        options as ActorRunnerOptionsWithActor;
      if (logger !== this.defaultLogger) {
        // @ts-expect-error private
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        actor.logger = actor._actorScope.logger = logger;
      }
      actor.system.inspect(xs.toObserver(transitionInspector));
    } else {
      const {logger = this.defaultLogger, id = this.defaultId} =
        options as ActorRunnerOptions;
      actor = xs.createActor(this.defaultActorLogic, {
        input: input as xs.InputFrom<T>,
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

    const p = xs.toPromise(actor);
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
