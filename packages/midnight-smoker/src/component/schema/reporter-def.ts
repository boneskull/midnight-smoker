/**
 * Defines the {@link ReporterDef} type, which plugins may use to create a
 * reporter.
 *
 * @packageDocumentation
 */
import {
  InstallEvent,
  PackEvent,
  RuleEvent,
  RunScriptEvent,
  SmokerEvent,
} from '#event/event-constants';
import {BaseSmokerOptionsSchema} from '#options/options';
import {
  type ReporterDef,
  type ReporterWhenCallback,
} from '#reporter/reporter-def';
import * as InstallEvents from '#schema/install-event';
import * as PackEvents from '#schema/pack-event';
import * as RuleRunnerEvents from '#schema/rule-runner-event';
import * as ScriptRunnerEvents from '#schema/script-runner-event';
import * as SmokerEvents from '#schema/smoker-event';
import {
  DefaultFalseSchema,
  NonEmptyStringSchema,
  PackageJsonSchema,
  VoidOrPromiseVoidSchema,
  customSchema,
} from '#util/schema-util';
import {z} from 'zod';

export * from '#reporter/reporter-def';

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

export const PackEventListenerSchemas = {
  [`on${PackEvent.PackBegin}` as const]: eventListenerSchema(
    PackEvents.PackBeginEventDataSchema,
  ),
  [`on${PackEvent.PackFailed}` as const]: eventListenerSchema(
    PackEvents.PackFailedEventDataSchema,
  ),
  [`on${PackEvent.PackOk}` as const]: eventListenerSchema(
    PackEvents.PackOkEventDataSchema,
  ),
} as const;
export const InstallEventListenerSchemas = {
  [`on${InstallEvent.InstallBegin}` as const]: eventListenerSchema(
    InstallEvents.InstallBeginEventDataSchema,
  ),
  [`on${InstallEvent.InstallFailed}` as const]: eventListenerSchema(
    InstallEvents.InstallFailedEventDataSchema,
  ),
  [`on${InstallEvent.InstallOk}` as const]: eventListenerSchema(
    InstallEvents.InstallOkEventDataSchema,
  ),
} as const;

export const RuleEventListenerSchemas = {
  [`on${RuleEvent.RunRulesBegin}` as const]: eventListenerSchema(
    RuleRunnerEvents.RunRulesBeginEventDataSchema,
  ),
  [`on${RuleEvent.RunRuleBegin}` as const]: eventListenerSchema(
    RuleRunnerEvents.RuleBeginEventDataSchema,
  ),
  [`on${RuleEvent.RunRuleOk}` as const]: eventListenerSchema(
    RuleRunnerEvents.RuleOkEventDataSchema,
  ),
  [`on${RuleEvent.RunRuleFailed}` as const]: eventListenerSchema(
    RuleRunnerEvents.RuleFailedEventDataSchema,
  ),
  [`on${RuleEvent.RunRulesFailed}` as const]: eventListenerSchema(
    RuleRunnerEvents.RunRulesFailedEventDataSchema,
  ),
  [`on${RuleEvent.RunRulesOk}` as const]: eventListenerSchema(
    RuleRunnerEvents.RunRulesOkEventDataSchema,
  ),
  [`on${RuleEvent.RuleError}` as const]: eventListenerSchema(
    RuleRunnerEvents.RuleErrorEventDataSchema,
  ),
} as const;

export const ScriptEventListenerSchemas = {
  [`on${RunScriptEvent.RunScriptBegin}` as const]: eventListenerSchema(
    ScriptRunnerEvents.ScriptBeginEventDataSchema,
  ),
  [`on${RunScriptEvent.RunScriptOk}` as const]: eventListenerSchema(
    ScriptRunnerEvents.ScriptOkEventDataSchema,
  ),
  [`on${RunScriptEvent.RunScriptFailed}` as const]: eventListenerSchema(
    ScriptRunnerEvents.ScriptFailedEventDataSchema,
  ),
  [`on${RunScriptEvent.RunScriptsBegin}` as const]: eventListenerSchema(
    ScriptRunnerEvents.RunScriptsEventDataSchema,
  ),
  [`on${RunScriptEvent.RunScriptsOk}` as const]: eventListenerSchema(
    ScriptRunnerEvents.RunScriptsEndEventDataSchema,
  ),
  [`on${RunScriptEvent.RunScriptsFailed}` as const]: eventListenerSchema(
    ScriptRunnerEvents.RunScriptsEndEventDataSchema,
  ),
} as const;

export const SmokerEventListenerSchemas = {
  [`on${SmokerEvent.BeforeExit}` as const]: eventListenerSchema(
    SmokerEvents.BeforeExitEventDataSchema,
  ),
  [`on${SmokerEvent.Lingered}` as const]: eventListenerSchema(
    SmokerEvents.LingeredEventDataSchema,
  ),
  [`on${SmokerEvent.SmokeBegin}` as const]: eventListenerSchema(
    SmokerEvents.SmokeBeginEventDataSchema,
  ),
  [`on${SmokerEvent.SmokeFailed}` as const]: eventListenerSchema(
    SmokerEvents.SmokeFailedEventDataSchema,
  ),
  [`on${SmokerEvent.SmokeOk}` as const]: eventListenerSchema(
    SmokerEvents.SmokeOkEventDataSchema,
  ),
  [`on${SmokerEvent.UnknownError}` as const]: eventListenerSchema(
    SmokerEvents.UnknownErrorEventDataSchema,
  ),
};

export const AllListenerSchemas = {
  ...PackEventListenerSchemas,
  ...InstallEventListenerSchemas,
  ...ScriptEventListenerSchemas,
  ...RuleEventListenerSchemas,
  ...SmokerEventListenerSchemas,
} as const;

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
 * Values of {@link ReporterDef.stdout} and {@link ReporterDef.stderr}
 */
export type ReporterStream = z.infer<typeof ReporterStreamSchema>;

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

/**
 * Schema representing a {@link ReporterWhenCallback} function
 */
export const ReporterWhenCallbackSchema = customSchema<ReporterWhenCallback>(
  z.function(
    z.tuple([ReporterContextSchema, BaseSmokerOptionsSchema] as [
      context: typeof ReporterContextSchema,
      opts: typeof BaseSmokerOptionsSchema,
    ]),
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

export const ListenerSchemas = {
  ...PackEventListenerSchemas,
  ...InstallEventListenerSchemas,
  ...ScriptEventListenerSchemas,
  ...RuleEventListenerSchemas,
  ...SmokerEventListenerSchemas,
} as const;

/**
 * Schema for a {@link ReporterDef} as defined by a plugin
 *
 * @todo Why custom schema here?
 */
export const ReporterDefSchema = customSchema<ReporterDef>(
  z.object({
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
     * Custom `stderr` stream or callback to provide one.
     */
    stderr: ReporterStreamSchema.optional(),

    /**
     * Custom `stdout` stream or callback to provide one.
     */
    stdout: ReporterStreamSchema.optional(),

    /**
     * Before instantiation of `Smoker`, this callback will be executed with a
     * `SmokerOptions` object. If this returns `true`, the reporter will be
     * used. If it returns `false`, it will not be used.
     *
     * Use this to automatically enable or disable itself based on options
     * passed to `Smoker`. **Do not use this to strip users of agency.**
     */
    when: ReporterWhenCallbackSchema.optional(),

    /**
     * Setup function; called before `Smoker` emits any events
     */
    setup: z
      .function(
        z.tuple([ReporterContextSchema] as [
          context: typeof ReporterContextSchema,
        ]),
        VoidOrPromiseVoidSchema,
      )
      .optional(),

    /**
     * Teardown function; called just before `Smoker` exits
     */
    teardown: z
      .function(
        z.tuple([ReporterContextSchema] as [
          context: typeof ReporterContextSchema,
        ]),
        VoidOrPromiseVoidSchema,
      )
      .optional(),

    ...ListenerSchemas,
  }),
);
