/**
 * Provides {@link ReporterContext} which is an object all reporter event
 * listeners receive
 *
 * @packageDocumentation
 */

import {type StaticPluginMetadata} from '#defs/plugin';
import {type EventData} from '#event/events';
import {type PackageJson} from '#schema/package-json';
import {type SmokerOptions} from '#schema/smoker-options';
import * as assert from '#util/assert';
import {
  type Observer,
  type Subscribable,
  type Subscription,
  toObserver,
} from 'xstate';

/**
 * The object all reporter listeners receive.
 *
 * This object is also available during the setup/teardown lifecycles of a
 * reporter.
 *
 * The context has some base properties that are always available, and the
 * implementor can define extra properties as desired. _Our_ portion is
 * readonly, though.
 */
export type ReporterContext<Ctx extends object = object> = Ctx &
  Readonly<BaseReporterContext>;

export type {Observer, Subscribable, Subscription};

/**
 * Mapping of `ReporterContext` to `ReporterContextObserver`.
 *
 * A `ReporterContext` may only have one `ReporterContextObserver`, but the
 * `ReporterContextObserver` may contain many subscribers.
 */
const reporterContextObservers = new WeakMap<
  ReporterContext,
  ReporterContextObserver
>();

/**
 * @internal
 */
export class ReporterContextObserver
  implements Disposable, Observer<EventData>
{
  /**
   * All observers listening to events on the associated `ReporterContext`
   */
  #observers: Set<Observer<EventData>> = new Set();

  private constructor() {}

  public static create() {
    return new ReporterContextObserver();
  }

  public static getObserverForContext(
    ctx: ReporterContext,
  ): ReporterContextObserver {
    assert.ok(
      reporterContextObservers.has(ctx),
      'No observer found for ReporterContext! This is a bug.',
    );
    return reporterContextObservers.get(ctx)!;
  }

  public static maybeGetObserverForContext(
    ctx: ReporterContext,
  ): ReporterContextObserver | undefined {
    return reporterContextObservers.get(ctx);
  }

  public add(observer: Observer<EventData>) {
    this.#observers.add(observer);
  }

  public complete() {
    for (const observer of this.#observers) {
      observer.complete?.();
    }
    this.#observers = new Set();
  }

  public createReporterContext<Ctx extends object = object>(
    opts: SmokerOptions,
    pkgJson: PackageJson,
    plugin: StaticPluginMetadata,
    signal?: AbortSignal,
  ): ReporterContext<Ctx> {
    const ctx = new BaseReporterContext(opts, pkgJson, plugin, signal);
    reporterContextObservers.set(ctx, this);
    return ctx as ReporterContext<Ctx>;
  }

  public delete(observer: Observer<EventData>) {
    this.#observers.delete(observer);
  }

  public error(error: unknown) {
    for (const observer of this.#observers) {
      observer.error?.(error);
    }
  }

  public next(eventData: EventData) {
    for (const observer of this.#observers) {
      observer.next?.(eventData);
    }
  }

  [Symbol.dispose](): void {
    this.#observers.clear();
  }
}

/**
 * Mostly just a pile of data and the {@link BaseReporterContext.subscribe}
 * method.
 *
 * @internal
 */
export class BaseReporterContext implements Subscribable<EventData> {
  constructor(
    public opts: SmokerOptions,
    public pkgJson: PackageJson,
    public plugin: StaticPluginMetadata,
    public signal?: AbortSignal,
  ) {}

  public subscribe(observer: Observer<EventData>): Subscription;
  public subscribe(
    nextListener?: (event: EventData) => void,
    errorListener?: (error: any) => void,
    completeListener?: () => void,
  ): Subscription;

  /**
   * Subscribes to all events which could be received by a `Reporter`
   *
   * @param nextListenerOrObserver An `Observer` or just the `next` listener
   * @param errorListener `error` listener, if any
   * @param completeListener `complete` listener, if any
   * @returns Subscription to all events which could be received by a `Reporter`
   */
  public subscribe(
    nextListenerOrObserver?:
      | ((snapshot: EventData) => void)
      | Observer<EventData>,
    errorListener?: (error: any) => void,
    completeListener?: () => void,
  ): Subscription {
    const observer = toObserver(
      nextListenerOrObserver,
      errorListener,
      completeListener,
    );

    ReporterContextObserver.getObserverForContext(this).add(observer);

    return {
      unsubscribe: () => {
        ReporterContextObserver.maybeGetObserverForContext(this)?.delete(
          observer,
        );
      },
    };
  }
}
