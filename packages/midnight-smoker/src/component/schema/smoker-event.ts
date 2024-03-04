import {SmokeFailedError} from '#error/smoker-error';
import {type SmokerEvent} from '#event/event-constants';
import {BaseSmokerOptionsSchema} from '#options/options';
import {type InstallEventData} from '#schema/install-event';
import {type RuleEventData} from '#schema/lint-event';
import {LintResultSchema} from '#schema/lint-result';
import {type PackEventData} from '#schema/pack-event';
import {RunScriptResultSchema} from '#schema/run-script-result';
import {type ScriptEventData} from '#schema/script-event';
import {StaticPluginMetadataSchema} from '#schema/static-plugin-metadata';
import {
  NonEmptyNonEmptyStringArraySchema,
  instanceofSchema,
} from '#util/schema-util';
import {z} from 'zod';

/**
 * {@inheritDoc BeforeExitEventDataSchema}
 */
export type BeforeExitEventData = z.infer<typeof BeforeExitEventDataSchema>;

/**
 * {@inheritDoc LingeredEventDataSchema}
 */
export type LingeredEventData = z.infer<typeof LingeredEventDataSchema>;

/**
 * {@inheritDoc SmokeBeginEventDataSchema}
 */
export type SmokeBeginEventData = z.infer<typeof SmokeBeginEventDataSchema>;

/**
 * {@inheritDoc SmokeFailedEventDataSchema}
 */
export type SmokeFailedEventData = z.infer<typeof SmokeFailedEventDataSchema>;

/**
 * {@inheritDoc SmokeOkEventDataSchema}
 */
export type SmokeOkEventData = z.infer<typeof SmokeOkEventDataSchema>;

/**
 * {@inheritDoc UnknownErrorEventDataSchema}
 */
export type UnknownErrorEventData = z.infer<typeof UnknownErrorEventDataSchema>;

/**
 * Data for the `BeforeExit` event
 */
export const BeforeExitEventDataSchema = z.record(z.unknown());

/**
 * Data for the `Lingered` event
 */
export const LingeredEventDataSchema = z.object({
  directories: NonEmptyNonEmptyStringArraySchema,
});

/**
 * Data for the `SmokeBegin` event
 */
export const SmokeBeginEventDataSchema = z.object({
  plugins: z.array(StaticPluginMetadataSchema),
  opts: BaseSmokerOptionsSchema,
});

/**
 * Data for the `SmokeOk` event
 */
export const SmokeOkEventDataSchema = SmokeBeginEventDataSchema.extend({
  scripts: z.array(RunScriptResultSchema).optional(),
  lint: LintResultSchema.optional(),
});

/**
 * Data for the `SmokeFailed` event
 */
export const SmokeFailedEventDataSchema = SmokeBeginEventDataSchema.extend({
  error: instanceofSchema(SmokeFailedError),
});

/**
 * Data for the `UnknownError` event
 */
export const UnknownErrorEventDataSchema = z.object({
  error: instanceofSchema(Error),
});

/**
 * Mapping of all events + data that emitted only by the `Smoker` class
 */
export type SmokerEventData = {
  [SmokerEvent.BeforeExit]: BeforeExitEventData;
  [SmokerEvent.Lingered]: LingeredEventData;
  [SmokerEvent.SmokeBegin]: SmokeBeginEventData;
  [SmokerEvent.SmokeFailed]: SmokeFailedEventData;
  [SmokerEvent.SmokeOk]: SmokeOkEventData;
  [SmokerEvent.UnknownError]: UnknownErrorEventData;
};

/**
 * The final result type of a `midnight-smoker` run
 */
export type SmokeResults = SmokeOkEventData;

/**
 * Mapping of all events + data that can be emitted by `midnight-smoker`.
 */
export type AllEventData = SmokerEventData &
  InstallEventData &
  PackEventData &
  ScriptEventData &
  RuleEventData;

/**
 * All events emitted by `midnight-smoker`
 */
export type EventKind = keyof AllEventData;

/**
 * Data associated with a specific event
 *
 * @template T - The event
 */
export type EventData<T extends EventKind = EventKind> = {
  [K in T]: {event: K} & AllEventData[K];
}[T];
