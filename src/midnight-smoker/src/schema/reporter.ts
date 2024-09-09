/**
 * Defines the {@link Reporter} type, which plugins may use to create a reporter.
 *
 * @packageDocumentation
 */
import {type Events} from '#constants/event';
import {type EventData, type EventName} from '#event/events';
import {type ReporterContext} from '#reporter/reporter-context';
import {type SmokerOptions, SmokerOptionsSchema} from '#schema/smoker-options';
import {
  AnyObjectSchema,
  asObjectSchema,
  DefaultFalseSchema,
  NonEmptyStringSchema,
  VoidOrPromiseVoidSchema,
} from '#util/schema-util';
import {z} from 'zod';

import {NormalizedPackageJsonSchema} from './package-json.js';

/**
 * Before instantiation of `Smoker`, this callback will be executed with a
 * `SmokerOptions` object. If this returns `true`, the reporter will be used. If
 * it returns `false`, it will not be used.
 *
 * Use this to automatically enable or disable itself based on options passed to
 * `Smoker`. **Do not use this to strip users of agency.**
 */

export type ReporterWhenCallback = (smokerOptions: SmokerOptions) => boolean;

export type ReporterListener<Evt extends EventName, Ctx = unknown> = (
  this: void,
  ctx: ReporterContext<Ctx>,
  data: EventData<Evt>,
) => Promise<void> | void;

export type ReporterSetupFn<Ctx = unknown> = (
  ctx: ReporterContext<Ctx>,
) => Promise<void> | void;

export type ReporterTeardownFn<Ctx = unknown> = (
  ctx: ReporterContext<Ctx>,
) => Promise<void> | void;

/**
 * All of the functions which a reporter can implement which map to events
 * raised by `midnight-smoker`.
 */

export type ReporterListeners<Ctx = unknown> = {
  -readonly [K in keyof typeof Events as `on${K}`]: ReporterListener<
    (typeof Events)[K],
    Ctx
  >;
};

type InvertMap<T extends Record<keyof T, keyof any>> = {
  [K in keyof T as T[K]]: K;
};

type InvertedEventsMap = InvertMap<typeof Events>;

/**
 * Mapping of event types to listener method names
 */
export type EventToListenerNameMap = {
  [K in keyof InvertedEventsMap]: `on${InvertedEventsMap[K]}`;
};

export type SomeReporter = Reporter<any>;

/**
 * A reporter definition, as provided by a plugin author.
 */

export interface Reporter<Ctx = unknown>
  extends Partial<ReporterListeners<Ctx>> {
  /**
   * Reporter description.
   *
   * Required
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
  when?: ReporterWhenCallback;
}

/**
 * Parameters passed to a {@link ReporterFn} by `midnight-smoker`
 */
export const ReporterContextSchema = z
  .object({
    /**
     * Options for `midnight-smoker`
     */
    opts: SmokerOptionsSchema,

    /**
     * `midnight-smoker`'s `package.json`
     */
    pkgJson: NormalizedPackageJsonSchema,
  })
  .passthrough();

/**
 * Schema representing a {@link ReporterWhenCallback} function
 */
export const ReporterWhenCallbackSchema: z.ZodType<ReporterWhenCallback> =
  z.function(
    z.tuple([SmokerOptionsSchema] as [
      smokerOptions: typeof SmokerOptionsSchema,
    ]),
    z.boolean(),
  );

export const ReporterSetupFnSchema = z.function(
  z.tuple([ReporterContextSchema] as [context: typeof ReporterContextSchema]),
  VoidOrPromiseVoidSchema,
);

export const ReporterTeardownFnSchema = z.function(
  z.tuple([ReporterContextSchema] as [context: typeof ReporterContextSchema]),
  VoidOrPromiseVoidSchema,
);

/**
 * Schema for a {@link Reporter} as defined by a plugin
 */
export const ReporterSchema = asObjectSchema(
  z
    .object({
      /**
       * Reporter description.
       *
       * Required
       */
      description: NonEmptyStringSchema,

      /**
       * If `true`, this reporter will be hidden from the list of reporters.
       */
      isHidden: DefaultFalseSchema,

      /**
       * Reporter name.
       *
       * Required
       */
      name: NonEmptyStringSchema,

      /**
       * Setup function; called before `Smoker` emits any events
       */
      setup: ReporterSetupFnSchema.optional(),

      /**
       * Teardown function; called just before `Smoker` exits
       */
      teardown: ReporterTeardownFnSchema.optional(),

      /**
       * Before instantiation of `Smoker`, this callback will be executed with a
       * `SmokerOptions` object. If this returns `true`, the reporter will be
       * used. If it returns `false`, it will not be used.
       *
       * Use this to automatically enable or disable itself based on options
       * passed to `Smoker`. **Do not use this to strip users of agency.**
       */
      when: ReporterWhenCallbackSchema.optional(),
    })
    .catchall(
      z.function(
        z.tuple([ReporterContextSchema, AnyObjectSchema] as [
          context: typeof ReporterContextSchema,
          event: typeof AnyObjectSchema,
        ]),
        VoidOrPromiseVoidSchema,
      ),
    ),
);
