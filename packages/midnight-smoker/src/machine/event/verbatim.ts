import {type SmokerEvent} from '#constants/event';
import {type DataForEvent} from '#event/events';

/**
 * These events are emitted by the bus machines, and are identical to the "real"
 * events emitted by midnight-smoker.
 */

export type VerbatimEvents = DataForEvent<VerbatimEventNames>;

export type VerbatimEventNames =
  | typeof SmokerEvent.LintOk
  | typeof SmokerEvent.LintFailed
  | typeof SmokerEvent.PackOk
  | typeof SmokerEvent.PackFailed
  | typeof SmokerEvent.InstallOk
  | typeof SmokerEvent.InstallFailed
  | typeof SmokerEvent.RunScriptsFailed
  | typeof SmokerEvent.RunScriptsOk;
