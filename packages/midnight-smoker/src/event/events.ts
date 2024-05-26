import {type InstallEventData} from './install-events';
import {type LintEventData} from './lint-events';
import {type PackEventData} from './pack-events';
import {type ScriptEventData} from './script-events';
import {type SmokerEventData} from './smoker-events';

/**
 * Describes the data emitted by each event.
 */
export type EventData = InstallEventData &
  PackEventData &
  LintEventData &
  ScriptEventData &
  SmokerEventData;

/**
 * Names of all events emitted by `midnight-smoker`
 */
export type EventName = keyof EventData;

/**
 * Data associated with a specific event with an additional `type` field
 * containing the event name
 *
 * @template T - The event name
 */
export type DataForEvent<T extends EventName> = {
  [K in T]: {type: K} & Omit<EventData[K], 'type'>;
}[T];

export type SomeDataForEvent = DataForEvent<EventName>;
