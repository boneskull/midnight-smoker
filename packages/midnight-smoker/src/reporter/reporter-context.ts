import {type EventData} from '#event/events';
import {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';
import {type SmokerOptions} from '#schema/smoker-options';
import {type PackageJson} from 'type-fest';
import {
  type Observer,
  type Subscribable,
  type Subscription,
  toObserver,
} from 'xstate';

/**
 * The reporter context is like a `this`, but it's passed as an argument.
 *
 * The context has some base properties that are always available, and the
 * implementor can define extra properties as desired.
 */
export type ReporterContext<Ctx = unknown> = Ctx & Readonly<ReporterCtx>;

const subjects = new WeakMap<ReporterContext, ReporterContextSubject>();

/**
 * @internal
 */
export class ReporterContextSubject implements Disposable {
  private observers: Set<Observer<EventData>> = new Set();

  private constructor() {}

  public static create() {
    return new ReporterContextSubject();
  }

  public static getSubject(ctx: ReporterContext): ReporterContextSubject {
    return subjects.get(ctx)!;
  }

  public add(observer: Observer<EventData>) {
    this.observers.add(observer);
  }

  public complete() {
    for (const subscriber of this.observers) {
      subscriber.complete?.();
    }
    this.observers = new Set();
  }

  public createReporterContext<Ctx = unknown>(
    opts: SmokerOptions,
    pkgJson: PackageJson,
    plugin: StaticPluginMetadata,
    signal?: AbortSignal,
  ): ReporterContext<Ctx> {
    const ctx = new ReporterCtx(opts, pkgJson, plugin, signal);
    subjects.set(ctx, this);
    return ctx as ReporterContext<Ctx>;
  }

  public delete(observer: Observer<EventData>) {
    this.observers.delete(observer);
  }

  public next(eventData: EventData) {
    for (const observer of this.observers) {
      try {
        observer.next?.(eventData);
      } catch (err) {
        observer.error?.(err);
      }
    }
  }

  [Symbol.dispose](): void {
    this.observers.clear();
  }
}

export type SubscribableEventData = Subscribable<EventData>;

export class ReporterCtx implements SubscribableEventData {
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

    ReporterContextSubject.getSubject(this)!.add(observer);

    return {
      unsubscribe: () => {
        ReporterContextSubject.getSubject(this)!.delete(observer);
      },
    };
  }
}
