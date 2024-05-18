/**
 * Defines the {@link ReporterDef} type, which plugins may use to create a
 * reporter.
 *
 * @packageDocumentation
 */
import {type DataForEvent, type EventData, type EventName} from '#event';
import {BaseSmokerOptionsSchema, type SmokerOptions} from '#options/options';
import {type StaticPluginMetadata} from '#plugin/static-metadata';
import {
  DefaultFalseSchema,
  NonEmptyStringSchema,
  PackageJsonSchema,
  VoidOrPromiseVoidSchema,
} from '#util/schema-util';
import {type PackageJson} from 'type-fest';
import {z} from 'zod';

/**
 * Before instantiation of `Smoker`, this callback will be executed with a
 * `SmokerOptions` object. If this returns `true`, the reporter will be used. If
 * it returns `false`, it will not be used.
 *
 * Use this to automatically enable or disable itself based on options passed to
 * `Smoker`. **Do not use this to strip users of agency.**
 */

export type ReporterWhenCallback = z.infer<typeof ReporterWhenCallbackSchema>;

/**
 * The reporter context is like a `this`, but it's passed as an argument.
 *
 * The context has some base properties that are always available, and the
 * implementor can define extra properties as desired.
 *
 * Functions in a {@link ReporterDef} have no context.
 */

export type ReporterContext<Ctx = unknown> = {
  opts: SmokerOptions;
  pkgJson: PackageJson;
  plugin: StaticPluginMetadata;
} & Ctx;

export type SomeReporterContext = ReporterContext<object>;

export type ReporterListener<Evt extends EventName, Ctx = unknown> = (
  this: void,
  ctx: ReporterContext<Ctx>,
  data: DataForEvent<Evt>,
) => void | Promise<void>;

export type ReporterSetupFn<Ctx = unknown> = (
  ctx: ReporterContext<Ctx>,
) => void | Promise<void>;

export type ReporterTeardownFn<Ctx = unknown> = (
  ctx: ReporterContext<Ctx>,
) => void | Promise<void>;

/**
 * All of the functions which a reporter can implement which map to events
 * raised by `midnight-smoker`.
 */

export type ReporterListeners<Ctx = unknown> = {
  [K in keyof EventData as `on${K}`]: ReporterListener<K, Ctx>;
};

/**
 * A reporter definition, as provided by a plugin author.
 */

export interface ReporterDef<Ctx = unknown>
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
   * Before instantiation of `Smoker`, this callback will be executed with a
   * `SmokerOptions` object. If this returns `true`, the reporter will be used.
   * If it returns `false`, it will not be used.
   *
   * Use this to automatically enable or disable itself based on options passed
   * to `Smoker`. **Do not use this to strip users of agency.**
   */
  when?: ReporterWhenCallback;

  /**
   * Setup function; called before `Smoker` emits any events
   */
  setup?: ReporterSetupFn<Ctx>;

  /**
   * Teardown function; called just before `Smoker` exits
   */
  teardown?: ReporterTeardownFn<Ctx>;
}

/**
 * Parameters passed to a {@link ReporterFn} by `midnight-smoker`
 */
export const ReporterContextSchema = z
  .object({
    /**
     * Options for `midnight-smoker`
     */
    opts: BaseSmokerOptionsSchema,

    /**
     * `midnight-smoker`'s `package.json`
     */
    pkgJson: PackageJsonSchema,
  })
  .passthrough();

/**
 * Schema representing a {@link ReporterWhenCallback} function
 */
export const ReporterWhenCallbackSchema = z
  .function(
    z.tuple([BaseSmokerOptionsSchema] as [
      opts: typeof BaseSmokerOptionsSchema,
    ]),
    z.boolean(),
  )
  .optional();

export const ReporterSetupFnSchema = z
  .function(
    z.tuple([ReporterContextSchema] as [context: typeof ReporterContextSchema]),
    VoidOrPromiseVoidSchema,
  )
  .optional();

export const ReporterTeardownFnSchema = z
  .function(
    z.tuple([ReporterContextSchema] as [context: typeof ReporterContextSchema]),
    VoidOrPromiseVoidSchema,
  )
  .optional();

/**
 * Schema for a {@link ReporterDef} as defined by a plugin
 */
export const ReporterDefSchema = z
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
     * Before instantiation of `Smoker`, this callback will be executed with a
     * `SmokerOptions` object. If this returns `true`, the reporter will be
     * used. If it returns `false`, it will not be used.
     *
     * Use this to automatically enable or disable itself based on options
     * passed to `Smoker`. **Do not use this to strip users of agency.**
     */
    when: ReporterWhenCallbackSchema,

    /**
     * Setup function; called before `Smoker` emits any events
     */
    setup: ReporterSetupFnSchema,

    /**
     * Teardown function; called just before `Smoker` exits
     */
    teardown: ReporterTeardownFnSchema,
  })
  .catchall(
    z.function(
      z.tuple([ReporterContextSchema, z.object({}).passthrough()]),
      VoidOrPromiseVoidSchema,
    ),
  );

export type SomeReporterDef = ReporterDef<any>;
