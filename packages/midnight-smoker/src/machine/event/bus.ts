/**
 * Exports {@link BusEvent}.
 *
 * @packageDocumentation
 */

import {type Events} from '#constants/event';
import {type EventData} from '#event/events';

/**
 * Events emitted by bus machines and received by `SmokeMachine`.
 *
 * These are _not_ re-emitted by `SmokeMachine`.
 *
 * @event
 */

export type BusEvent = EventData<BusEventName>;

/**
 * Names of {@link BusEvent} events.
 */
export type BusEventName =
  | typeof Events.InstallFailed
  | typeof Events.InstallOk
  | typeof Events.LintFailed
  | typeof Events.LintOk
  | typeof Events.PackFailed
  | typeof Events.PackOk
  | typeof Events.ScriptsFailed
  | typeof Events.ScriptsOk;
