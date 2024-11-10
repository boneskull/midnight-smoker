/**
 * Defines the {@link Reporter} type, which plugins may use to create a reporter.
 *
 * @module midnight-smoker/defs/reporter
 */
import {type Events} from '#constants/event';
import {type StaticPluginMetadata} from '#defs/plugin';
import {type EventData, type EventType} from '#event/events';
import {
  type Observer,
  type ReporterContext,
  type Subscribable,
  type Subscription,
} from '#reporter/reporter-context';
import {type PackageJson} from '#schema/package-json';
import {type SmokerOptions} from '#schema/smoker-options';

export type {Observer, ReporterContext, Subscribable, Subscription};

/**
 * Mapping of event types to listener method names
 */
export type EventTypeToListenerName = {
  [K in keyof EventTypeToEventName]: `on${EventTypeToEventName[K]}`;
};

/**
 * Mapping of event types to event names
 */
export type EventTypeToEventName = {
  [K in keyof typeof Events as (typeof Events)[K]]: K;
};

/**
 * Mostly just something that the `ReporterCtx` class can implement.
 *
 * @private
 */
export interface BaseReporterContext {
  opts: SmokerOptions;

  pkgJson: PackageJson;

  plugin: StaticPluginMetadata;
  signal?: AbortSignal;
}

/**
 * The type of a Reporter's listener on a specific event.
 *
 * @template T The event name
 * @template Ctx Extra context
 */
export type ReporterListener<
  T extends EventType = EventType,
  Ctx extends object = object,
> = (
  this: void,
  ctx: ReporterContext<Ctx>,
  data: EventData<T>,
) => Promise<void> | void;

/**
 * Object keyed by `on<EventName>` where the value the associated
 * {@link ReporterListener}.
 *
 * This is only used to define {@link Reporter}.
 */
export type ReporterListeners<Ctx extends object = object> = {
  -readonly [K in keyof EventTypeToListenerName as EventTypeToListenerName[K]]?: ReporterListener<
    K,
    Ctx
  >;
};

/**
 * The "setup" lifecycle function for a {@link Reporter}
 */
export type ReporterSetupFn<Ctx extends object = object> = (
  ctx: ReporterContext<Ctx>,
) => Promise<void> | void;

/**
 * The "teardown" lifecycle function for a {@link Reporter}
 */
export type ReporterTeardownFn<Ctx extends object = object> = (
  ctx: ReporterContext<Ctx>,
) => Promise<void> | void;

/**
 * Before instantiation of `Smoker`, this callback will be executed with a
 * `SmokerOptions` object. If this returns `true`, the reporter will be used. If
 * it returns `false`, it will not be used.
 *
 * Use this to automatically enable or disable itself based on options passed to
 * `Smoker`. **Do not use this to strip users of agency.**
 */
export type ReporterWhenFn = (smokerOptions: SmokerOptions) => boolean;

/**
 * A {@link Reporter}, suitable for use in a collection
 */
export type SomeReporter = Reporter<any>;

/**
 * A `Reporter` definition, as provided by a plugin author.
 */
export interface Reporter<Ctx extends object = object>
  extends ReporterListeners<Ctx> {
  /**
   * A plugin author can add whatever props they want
   */
  [x: string]: unknown;

  /**
   * Reporter description
   */
  description: string;

  /**
   * If `true`, this reporter will be hidden from the list of reporters.
   */
  isHidden?: boolean;

  /**
   * Reporter name.
   *
   * Required
   */
  name: string;

  /**
   * Setup function; called before `Smoker` emits any events
   */
  setup?: ReporterSetupFn<Ctx>;

  /**
   * Teardown function; called just before `Smoker` exits
   */
  teardown?: ReporterTeardownFn<Ctx>;

  /**
   * Before instantiation of `Smoker`, this callback will be executed with a
   * `SmokerOptions` object. If this returns `true`, the reporter will be used.
   * If it returns `false`, it will not be used.
   *
   * Use this to automatically enable or disable itself based on options passed
   * to `Smoker`. **Do not use this to strip users of agency.**
   */
  when?: ReporterWhenFn;
}
