/**
 * Defines the {@link ReporterDef} type, which plugins may use to create a
 * reporter.
 *
 * @packageDocumentation
 */
import {type SmokerEvents} from '#event/event-types';
import {type StrictEmitter} from '#event/strict-emitter';
import {
  DefaultFalseSchema,
  EventEmitterSchema,
  NonEmptyStringSchema,
  PackageJsonSchema,
  customSchema,
} from '#util/schema-util';
import {z} from 'zod';
import {zBaseSmokerOptions, type SmokerOptions} from '../../options/options';

/**
 * The main implementation of a Reporter, which is expected to listen for events
 * emitted by {@link ReporterParams.emitter}, and write to its stream(s).
 *
 * Accepts {@link ReporterParams} and may be sync or async.
 *
 * This is {@link ReporterDef.reporter}.
 */
export type Reporter = (params: ReporterParams) => void | Promise<void>;

/**
 * Represents the parameters for {@link Reporter}
 */
export type ReporterParams = z.infer<typeof ReporterParamsSchema>;

/**
 * Values of {@link ReporterDef.stdout} and {@link ReporterDef.stderr}
 */
export type ReporterStream = z.infer<typeof ReporterStreamSchema>;

/**
 * Before instantiation of `Smoker`, this callback will be executed with a
 * `SmokerOptions` object. If this returns `true`, the reporter will be used. If
 * it returns `false`, it will not be used.
 *
 * Use this to automatically enable or disable itself based on options passed to
 * `Smoker`. **Do not use this to strip users of agency.**
 */
export type ReporterWhenCallback = (opts: Readonly<SmokerOptions>) => boolean;

// /**
//  * Parameters (not _options_, because they are all provided) for a
//  * {@link Reporter}
//  */
// export interface ReporterParams {
//   console: Console;
//   emitter: Readonly<StrictEmitter<SmokerEvents>>;
//   opts: Readonly<SmokerOptions>;
//   pkgJson: Readonly<PackageJson>;
//   stderr: NodeJS.WritableStream;
//   stdout: NodeJS.WritableStream;
// }

/**
 * Schema for a {@link NodeJS.WritableStream}
 *
 * _Warning_: Does no validation.
 */
export const WritableStreamSchema = customSchema<NodeJS.WritableStream>();

export const SmokerEventEmitterSchema =
  customSchema<Readonly<StrictEmitter<SmokerEvents>>>(EventEmitterSchema);

/**
 * Parameters passed to a {@link Reporter} by `midnight-smoker`
 */
export const ReporterParamsSchema = z.object({
  /**
   * A console for logging
   *
   * _Warning_: Does no validation.
   */
  console: customSchema<Console>(),

  /**
   * The `SmokerEvents` emitter for listening
   */
  emitter: SmokerEventEmitterSchema,

  /**
   * Options for `midnight-smoker`
   */
  opts: zBaseSmokerOptions,

  /**
   * `midnight-smoker`'s `package.json`
   */
  pkgJson: PackageJsonSchema,

  /**
   * The `stdout` stream as configured in {@link ReporterDef.stdout}
   */
  stdout: WritableStreamSchema,

  /**
   * The `stderr` stream as configured in {@link ReporterDef.stderr}
   */
  stderr: WritableStreamSchema,
});

/**
 * Schema representing a {@link Reporter} function
 */
export const ReporterSchema = customSchema<Reporter>(
  z.function(
    z.tuple([ReporterParamsSchema] as [typeof ReporterParamsSchema]),
    z.void().or(z.promise(z.void())),
  ),
);

/**
 * Schema representing a {@link ReporterWhenCallback} function
 */
export const ReporterWhenCallbackSchema = customSchema<ReporterWhenCallback>(
  z.function(
    z.tuple([zBaseSmokerOptions] as [opts: typeof zBaseSmokerOptions]),
    z.boolean(),
  ),
);

/**
 * Schema for values of {@link ReporterDef.stdout} and {@link ReporterDef.stderr}
 */
export const ReporterStreamSchema = z.union([
  WritableStreamSchema,
  z.function(z.tuple([]), WritableStreamSchema),
  z.function(z.tuple([]), z.promise(WritableStreamSchema)),
]);

/**
 * Schema for a {@link ReporterDef} as defined by a plugin
 */
export const ReporterDefSchema = z.object({
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
   * {@link Reporter} function.
   *
   * Required
   */
  reporter: ReporterSchema,

  /**
   * Custom `stderr` stream or callback to provide one.
   */
  stderr: ReporterStreamSchema.optional(),

  /**
   * Custom `stdout` stream or callback to provide one.
   */
  stdout: ReporterStreamSchema.optional(),

  /**
   * Before instantiation of `Smoker`, this callback will be executed with a
   * `SmokerOptions` object. If this returns `true`, the reporter will be used.
   * If it returns `false`, it will not be used.
   *
   * Use this to automatically enable or disable itself based on options passed
   * to `Smoker`. **Do not use this to strip users of agency.**
   */
  when: ReporterWhenCallbackSchema.optional(),
});

export type ReporterDef = z.input<typeof ReporterDefSchema>;
