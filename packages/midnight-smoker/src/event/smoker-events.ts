import {type InstallEventData} from '#schema/install-event';
import {type LintEventData} from '#schema/lint-event';
import {type PackEventData} from '#schema/pack-event';
import {type ScriptEventData} from '#schema/script-event';
import {type SmokerEventData} from '#schema/smoker-event';
import {type EventBus} from './bus';

/**
 * Describes the data emitted by each event.
 */
export type SmokerEvents = InstallEventData &
  PackEventData &
  LintEventData &
  ScriptEventData &
  SmokerEventData;

export type SmokerEventBus = EventBus<SmokerEvents, SmokerEvents>;
