/**
 * Exports {@link BusEvent}.
 *
 * @packageDocumentation
 */

import {type Events} from '#constants/event';
import {type DataForEvent} from '#event/events';

/**
 * Events emitted by bus machines and received by `SmokeMachine`.
 *
 * These are _not_ re-emitted by `SmokeMachine`.
 *
 * @event
 */

export type BusEvent = DataForEvent<BusEventName>;

/**
 * Names of {@link BusEvent} events.
 */
export type BusEventName =
  | typeof Events.LintOk
  | typeof Events.LintFailed
  | typeof Events.PackOk
  | typeof Events.PackFailed
  | typeof Events.InstallOk
  | typeof Events.InstallFailed
  | typeof Events.RunScriptsFailed
  | typeof Events.RunScriptsOk;
