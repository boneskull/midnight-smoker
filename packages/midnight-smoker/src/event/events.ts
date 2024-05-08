import {type InstallEventData} from './install-events';
import {type LintEventData} from './lint-events';
import {type PackEventData} from './pack-events';
import {type ScriptEventData} from './script-events';
import {type SmokerEventData} from './smoker-events';

/**
 * Describes the data emitted by each event.
 */
export type Events = InstallEventData &
  PackEventData &
  LintEventData &
  ScriptEventData &
  SmokerEventData;

/**
 * Names of all events emitted by `midnight-smoker`
 */
export type EventName = keyof Events;

/**
 * Data associated with a specific event
 *
 * @template T - The event name
 */
export type EventData<T extends EventName> = {
  [K in T]: {type: K} & Events[K];
}[T];
