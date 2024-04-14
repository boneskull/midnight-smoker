import {SmokeFailedError} from '#error/smoker-error';
import {type SmokerEvent, type SmokerEvents} from '#event';
import {BaseSmokerOptionsSchema} from '#options/options';
import {LintResultSchema} from '#schema/lint-result';
import {RunScriptResultSchema} from '#schema/run-script-result';
import {StaticPluginMetadataSchema} from '#schema/static-plugin-metadata';
import {
  NonEmptyNonEmptyStringArraySchema,
  instanceofSchema,
} from '#util/schema-util';
import {z} from 'zod';

/**
 * Emitted after all other events have been emitted, and just before exit.
 *
 * This implies that {@link SmokerEvents.UnknownError} will _not_ be emitted if
 * it has not been emitted already.
 *
 * @event
 */
export type BeforeExitEventData = z.infer<typeof BeforeExitEventDataSchema>;

/**
 * Emitted only if the `--linger` option was provided; a list of temp
 * directories used by `midnight-smoker` and left on disk at user behest.
 *
 * @event
 */
export type LingeredEventData = z.infer<typeof LingeredEventDataSchema>;

/**
 * Emitted just before the initial "pack" phase begins.
 *
 * @event
 */
export type SmokeBeginEventData = z.infer<typeof SmokeBeginEventDataSchema>;

/**
 * Emitted at the end of execution if any script or automated check failed.
 *
 * @event
 */
export type SmokeFailedEventData = z.infer<typeof SmokeFailedEventDataSchema>;

/**
 * Emitted at the end of execution if no script or automated check failed.
 *
 * @event
 */
export type SmokeOkEventData = z.infer<typeof SmokeOkEventDataSchema>;

/**
 * Emitted if `smoker.smoke()` rejects, which should not happen under normal
 * operation.
 *
 * I think.
 *
 * @event
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
 * The final result type of a `midnight-smoker` run
 */
export type SmokeResults = SmokeOkEventData;

/**
 * All events emitted by `midnight-smoker`
 */
export type EventKind = keyof SmokerEvents;

/**
 * Data associated with a specific event
 *
 * @template T - The event
 */
export type EventData<T extends EventKind = EventKind> = {
  [K in T]: {event: K} & SmokerEvents[K];
}[T];

export type SmokerEventData = {
  [SmokerEvent.BeforeExit]: BeforeExitEventData;
  [SmokerEvent.Lingered]: LingeredEventData;
  [SmokerEvent.SmokeBegin]: SmokeBeginEventData;
  [SmokerEvent.SmokeFailed]: SmokeFailedEventData;
  [SmokerEvent.SmokeOk]: SmokeOkEventData;
  [SmokerEvent.UnknownError]: UnknownErrorEventData;
};
