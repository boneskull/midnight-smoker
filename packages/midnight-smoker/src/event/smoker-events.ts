import {type InstallEventData} from '#schema/install-event';
import {type LintEventData} from '#schema/lint-event';
import {type PackEventData} from '#schema/pack-event';
import {type ScriptEventData} from '#schema/script-event';
import {type SmokerEventData} from '#schema/smoker-event';

/**
 * Describes the data emitted by each event.
 */
export type SmokerEvents = InstallEventData &
  PackEventData &
  LintEventData &
  ScriptEventData &
  SmokerEventData;

/**
 * All events emitted by `midnight-smoker`
 */

export type EventName = keyof SmokerEvents;

/**
 * Data associated with a specific event
 *
 * @template T - The event
 */
export type EventData<T extends EventName> = {
  [K in T]: {type: K} & SmokerEvents[K];
}[T];
