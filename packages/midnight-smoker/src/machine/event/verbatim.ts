import {type Events} from '#constants/event';
import {type DataForEvent} from '#event/events';

/**
 * These events are emitted by the bus machines, and are identical to the "real"
 * events emitted by midnight-smoker.
 */

export type VerbatimEvents = DataForEvent<VerbatimEventNames>;

export type VerbatimEventNames =
  | typeof Events.LintOk
  | typeof Events.LintFailed
  | typeof Events.PackOk
  | typeof Events.PackFailed
  | typeof Events.InstallOk
  | typeof Events.InstallFailed
  | typeof Events.RunScriptsFailed
  | typeof Events.RunScriptsOk;
