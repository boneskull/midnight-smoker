/**
 * Defines the {@link ReporterDef} type, which plugins may use to create a
 * reporter.
 *
 * @packageDocumentation
 */
import {type EventData, type EventName, type SmokerEvents} from '#event';
import {
  InstallEvent,
  LintEvent,
  PackEvent,
  ScriptEvent,
  SmokerEvent,
} from '#event/event-constants';
import {BaseSmokerOptionsSchema, type SmokerOptions} from '#options/options';
import {
  DefaultFalseSchema,
  NonEmptyStringSchema,
  PackageJsonSchema,
  VoidOrPromiseVoidSchema,
  customSchema,
} from '#util/schema-util';
import {type PackageJson} from 'type-fest';
import {z, type ZodError} from 'zod';
import {fromZodError} from 'zod-validation-error';
import {InstallEventSchemas} from './install-event';
import {LintEventSchemas} from './lint-event';
import {PackEventSchemas} from './pack-event';
import {ScriptEventSchemas} from './script-event';
import {SmokerEventSchemas} from './smoker-event';

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
} & Ctx;

export type ReporterListener<Evt extends EventName, Ctx = unknown> = (
  this: void,
  ctx: ReporterContext<Ctx>,
  data: EventData<Evt>,
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
  [K in keyof SmokerEvents as `on${K}`]: ReporterListener<K, Ctx>;
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
 * Schema for a {@link NodeJS.WritableStream}
 *
 * _Warning_: Does no validation.
 */
export const WritableStreamSchema = customSchema<NodeJS.WritableStream>();

/**
 * Parameters passed to a {@link ReporterFn} by `midnight-smoker`
 */
export const ReporterContextSchema = z
  .object({
    /**
     * A console for logging
     *
     * _Warning_: Does no validation.
     */
    console: customSchema<Console>(),

    /**
     * Options for `midnight-smoker`
     */
    opts: BaseSmokerOptionsSchema,

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
  })
  .passthrough();

export function eventListenerSchema<T extends z.ZodTypeAny>(data: T) {
  return z
    .function(
      z.tuple([ReporterContextSchema, data] as [
        context: typeof ReporterContextSchema,
        data: typeof data,
      ]),
      VoidOrPromiseVoidSchema,
    )
    .optional();
}

export const ScriptEventListenerSchemas = {} as const;

export const SmokerEventListenerSchemas = {};

/**
 * The main implementation of a Reporter, which is expected to listen for events
 * emitted by {@link ReporterParams.emitter}, and write to its stream(s).
 *
 * Accepts {@link ReporterParams} and may be sync or async.
 *
 * This is {@link ReporterDef.reporter}.
 */
export type ReporterFn = (params: ReporterParams) => void | Promise<void>;

/**
 * Represents the parameters for {@link ReporterFn}
 */
export type ReporterParams = z.infer<typeof ReporterContextSchema>;

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
   * Before instantiation of `Smoker`, this callback will be executed with a
   * `SmokerOptions` object. If this returns `true`, the reporter will be used.
   * If it returns `false`, it will not be used.
   *
   * Use this to automatically enable or disable itself based on options passed
   * to `Smoker`. **Do not use this to strip users of agency.**
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
});

export const ReporterDefInstallListenersSchema = z
  .object({
    [`on${InstallEvent.InstallBegin}` as const]: z.function(
      z.tuple([ReporterContextSchema, InstallEventSchemas.InstallBegin] as [
        context: typeof ReporterContextSchema,
        data: typeof InstallEventSchemas.InstallBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${InstallEvent.InstallFailed}` as const]: z.function(
      z.tuple([ReporterContextSchema, InstallEventSchemas.InstallFailed] as [
        context: typeof ReporterContextSchema,
        data: typeof InstallEventSchemas.InstallFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${InstallEvent.InstallOk}` as const]: z.function(
      z.tuple([ReporterContextSchema, InstallEventSchemas.InstallOk] as [
        context: typeof ReporterContextSchema,
        data: typeof InstallEventSchemas.InstallOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${InstallEvent.PkgManagerInstallBegin}` as const]: z.function(
      z.tuple([
        ReporterContextSchema,
        InstallEventSchemas.PkgManagerInstallBegin,
      ] as [
        context: typeof ReporterContextSchema,
        data: typeof InstallEventSchemas.PkgManagerInstallBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${InstallEvent.PkgManagerInstallOk}` as const]: z.function(
      z.tuple([
        ReporterContextSchema,
        InstallEventSchemas.PkgManagerInstallOk,
      ] as [
        context: typeof ReporterContextSchema,
        data: typeof InstallEventSchemas.PkgManagerInstallOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${InstallEvent.PkgManagerInstallFailed}` as const]: z.function(
      z.tuple([
        ReporterContextSchema,
        InstallEventSchemas.PkgManagerInstallFailed,
      ] as [
        context: typeof ReporterContextSchema,
        data: typeof InstallEventSchemas.PkgManagerInstallFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
  })
  .partial();

export const ReporterDefPackListenersSchema = z
  .object({
    [`on${PackEvent.PackBegin}` as const]: z.function(
      z.tuple([ReporterContextSchema, PackEventSchemas.PackBegin] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PackBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${PackEvent.PackFailed}` as const]: z.function(
      z.tuple([ReporterContextSchema, PackEventSchemas.PackFailed] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PackFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${PackEvent.PackOk}` as const]: z.function(
      z.tuple([ReporterContextSchema, PackEventSchemas.PackOk] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PackOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${PackEvent.PkgManagerPackBegin}` as const]: z.function(
      z.tuple([ReporterContextSchema, PackEventSchemas.PkgManagerPackBegin] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PkgManagerPackBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${PackEvent.PkgManagerPackOk}` as const]: z.function(
      z.tuple([ReporterContextSchema, PackEventSchemas.PkgManagerPackOk] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PkgManagerPackOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${PackEvent.PkgManagerPackFailed}` as const]: z.function(
      z.tuple([
        ReporterContextSchema,
        PackEventSchemas.PkgManagerPackFailed,
      ] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PkgManagerPackFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${PackEvent.PkgPackBegin}` as const]: z.function(
      z.tuple([ReporterContextSchema, PackEventSchemas.PkgPackBegin] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PkgPackBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${PackEvent.PkgPackFailed}` as const]: z.function(
      z.tuple([ReporterContextSchema, PackEventSchemas.PkgPackFailed] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PkgPackFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${PackEvent.PkgPackOk}` as const]: z.function(
      z.tuple([ReporterContextSchema, PackEventSchemas.PkgPackOk] as [
        context: typeof ReporterContextSchema,
        data: typeof PackEventSchemas.PkgPackOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
  })
  .partial();

export const ReporterDefLintListenersSchema = z
  .object({
    [`on${LintEvent.LintBegin}` as const]: z.function(
      z.tuple([ReporterContextSchema, LintEventSchemas.LintBegin] as [
        context: typeof ReporterContextSchema,
        data: typeof LintEventSchemas.LintBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${LintEvent.RuleBegin}` as const]: z.function(
      z.tuple([ReporterContextSchema, LintEventSchemas.RuleBegin] as [
        context: typeof ReporterContextSchema,
        data: typeof LintEventSchemas.RuleBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${LintEvent.RuleOk}` as const]: z.function(
      z.tuple([ReporterContextSchema, LintEventSchemas.RuleOk] as [
        context: typeof ReporterContextSchema,
        data: typeof LintEventSchemas.RuleOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${LintEvent.RuleFailed}` as const]: z.function(
      z.tuple([ReporterContextSchema, LintEventSchemas.RuleFailed] as [
        context: typeof ReporterContextSchema,
        data: typeof LintEventSchemas.RuleFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${LintEvent.LintFailed}` as const]: z.function(
      z.tuple([ReporterContextSchema, LintEventSchemas.LintFailed] as [
        context: typeof ReporterContextSchema,
        data: typeof LintEventSchemas.LintFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${LintEvent.LintOk}` as const]: z.function(
      z.tuple([ReporterContextSchema, LintEventSchemas.LintOk] as [
        context: typeof ReporterContextSchema,
        data: typeof LintEventSchemas.LintOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${LintEvent.RuleError}` as const]: z.function(
      z.tuple([ReporterContextSchema, LintEventSchemas.RuleError] as [
        context: typeof ReporterContextSchema,
        data: typeof LintEventSchemas.RuleError,
      ]),
      VoidOrPromiseVoidSchema,
    ),
  })
  .partial();

export const ReporterDefSmokerListenersSchema = z
  .object({
    [`on${SmokerEvent.BeforeExit}` as const]: z.function(
      z.tuple([ReporterContextSchema, SmokerEventSchemas.BeforeExit] as [
        context: typeof ReporterContextSchema,
        data: typeof SmokerEventSchemas.BeforeExit,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${SmokerEvent.Lingered}` as const]: z.function(
      z.tuple([ReporterContextSchema, SmokerEventSchemas.Lingered] as [
        context: typeof ReporterContextSchema,
        data: typeof SmokerEventSchemas.Lingered,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${SmokerEvent.SmokeBegin}` as const]: z.function(
      z.tuple([ReporterContextSchema, SmokerEventSchemas.SmokeBegin] as [
        context: typeof ReporterContextSchema,
        data: typeof SmokerEventSchemas.SmokeBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${SmokerEvent.SmokeFailed}` as const]: z.function(
      z.tuple([ReporterContextSchema, SmokerEventSchemas.SmokeFailed] as [
        context: typeof ReporterContextSchema,
        data: typeof SmokerEventSchemas.SmokeFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${SmokerEvent.SmokeOk}` as const]: z.function(
      z.tuple([ReporterContextSchema, SmokerEventSchemas.SmokeOk] as [
        context: typeof ReporterContextSchema,
        data: typeof SmokerEventSchemas.SmokeOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${SmokerEvent.UnknownError}` as const]: z.function(
      z.tuple([ReporterContextSchema, SmokerEventSchemas.UnknownError] as [
        context: typeof ReporterContextSchema,
        data: typeof SmokerEventSchemas.UnknownError,
      ]),
      VoidOrPromiseVoidSchema,
    ),
  })
  .partial();

export const ReporterDefScriptListenersSchema = z
  .object({
    [`on${ScriptEvent.RunScriptBegin}` as const]: z.function(
      z.tuple([
        ReporterContextSchema,
        ScriptEventSchemas.PkgManagerRunScriptsBegin,
      ] as [
        context: typeof ReporterContextSchema,
        data: typeof ScriptEventSchemas.PkgManagerRunScriptsBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${ScriptEvent.RunScriptOk}` as const]: z.function(
      z.tuple([
        ReporterContextSchema,
        ScriptEventSchemas.PkgManagerRunScriptsOk,
      ] as [
        context: typeof ReporterContextSchema,
        data: typeof ScriptEventSchemas.PkgManagerRunScriptsOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${ScriptEvent.RunScriptFailed}` as const]: z.function(
      z.tuple([
        ReporterContextSchema,
        ScriptEventSchemas.PkgManagerRunScriptsFailed,
      ] as [
        context: typeof ReporterContextSchema,
        data: typeof ScriptEventSchemas.PkgManagerRunScriptsFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${ScriptEvent.RunScriptsBegin}` as const]: z.function(
      z.tuple([ReporterContextSchema, ScriptEventSchemas.RunScriptsBegin] as [
        context: typeof ReporterContextSchema,
        data: typeof ScriptEventSchemas.RunScriptsBegin,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${ScriptEvent.RunScriptsOk}` as const]: z.function(
      z.tuple([ReporterContextSchema, ScriptEventSchemas.RunScriptsOk] as [
        context: typeof ReporterContextSchema,
        data: typeof ScriptEventSchemas.RunScriptsOk,
      ]),
      VoidOrPromiseVoidSchema,
    ),
    [`on${ScriptEvent.RunScriptsFailed}` as const]: z.function(
      z.tuple([ReporterContextSchema, ScriptEventSchemas.RunScriptsFailed] as [
        context: typeof ReporterContextSchema,
        data: typeof ScriptEventSchemas.RunScriptsFailed,
      ]),
      VoidOrPromiseVoidSchema,
    ),
  })
  .partial();

export function assertReporterDef<Ctx = unknown>(
  value: unknown,
): asserts value is ReporterDef<Ctx> {
  try {
    ReporterDefSchema.parse(value);
    ReporterDefInstallListenersSchema.parse(value);
    ReporterDefPackListenersSchema.parse(value);
    ReporterDefLintListenersSchema.parse(value);
    ReporterDefSmokerListenersSchema.parse(value);
    ReporterDefScriptListenersSchema.parse(value);
  } catch (err) {
    throw fromZodError(err as ZodError);
  }
}
