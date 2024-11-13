import {
  type ReporterSetupFn,
  type ReporterTeardownFn,
  type ReporterWhenFn,
} from '#defs/reporter';
import {ReporterCtx} from '#reporter/reporter-context';
import {SmokerOptionsSchema} from '#schema/smoker-options';
import {
  AnyObjectSchema,
  asObjectSchema,
  DefaultFalseSchema,
  instanceofSchema,
  multiColorFnSchema,
  NonEmptyStringSchema,
} from '#util/schema-util';
import {z} from 'zod';

/**
 * Approximation of a `ReporterContext` object:
 *
 * - It's a {@link ReporterCtx} instance
 * - It also contains whatever the object `Ctx` type argument contains
 * - It's readonly
 */
export const ReporterContextSchema = instanceofSchema(
  ReporterCtx,
  AnyObjectSchema,
).readonly();

/**
 * Approximation of a `ReporterListenerFn`.
 *
 * Does not validate the `event` parameter.
 */
export const ReporterListenerFnSchema = multiColorFnSchema(
  z.function(
    z.tuple(
      [ReporterContextSchema, AnyObjectSchema] as [
        context: typeof ReporterContextSchema,
        event: typeof AnyObjectSchema, // this is whatever EventData is
      ],
      z.void(),
    ),
  ),
).or(
  multiColorFnSchema(
    z.function(
      z.tuple(
        [ReporterContextSchema] as [context: typeof ReporterContextSchema],
        z.void(),
      ),
    ),
  ),
);

/**
 * Schema representing a {@link ReporterWhenFn} function
 */
export const ReporterWhenFnSchema: z.ZodType<ReporterWhenFn> = z.function(
  z.tuple([SmokerOptionsSchema] as [smokerOptions: typeof SmokerOptionsSchema]),
  z.boolean(),
);

/**
 * Schema for a `ReporterSetupFn` function
 */
export const ReporterSetupFnSchema: z.ZodType<ReporterSetupFn> =
  multiColorFnSchema(
    z.function(
      z.tuple([ReporterContextSchema] as [
        context: typeof ReporterContextSchema,
      ]),
      z.void(),
    ),
  );

/**
 * Schema for a `ReporterTeardownFn` function
 */
export const ReporterTeardownFnSchema: z.ZodType<ReporterTeardownFn> =
  multiColorFnSchema(
    z.function(
      z.tuple([ReporterContextSchema] as [
        context: typeof ReporterContextSchema,
      ]),
      z.void(),
    ),
  );

/**
 * Schema for a {@link Reporter} as defined by a plugin
 *
 * @remarks
 * This must be inferred--I think because of the {@link asObjectSchema}
 * preprocessor.
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
      when: ReporterWhenFnSchema.optional(),
    })
    .catchall(ReporterListenerFnSchema.or(z.unknown())),
);
