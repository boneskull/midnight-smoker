import {type Simplify} from 'type-fest';

import {type CoreEventData} from './core-events';
import {type InstallEventData} from './install-events';
import {type LintEventData} from './lint-events';
import {type PackEventData} from './pack-events';
import {type ScriptEventData} from './script-events';

/**
 * Describes the data emitted by each event.
 */
export type AllEventData = Simplify<
  CoreEventData &
    InstallEventData &
    LintEventData &
    PackEventData &
    ScriptEventData
>;

/**
 * Data associated with a specific event with an additional `type` field
 * containing the event name
 *
 * @template T - The event name
 */
export type EventData<T extends EventName = EventName> = {
  [K in T]: {type: K} & Omit<AllEventData[K], 'type'>;
}[T];

/**
 * Names of all events emitted by `midnight-smoker`
 */
export type EventName = Simplify<keyof AllEventData>;

export type SomeDataForEvent = EventData;
