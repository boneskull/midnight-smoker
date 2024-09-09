/**
 * Script-related events received by `SmokeMachine`.
 *
 * These events are views into the public events as seen in
 * {@link ScriptEventData}.
 *
 * @remarks
 * `SmokeMachine` does not listen for each event individually; instead it
 * listens for `SCRIPT.*` events
 * @packageDocumentation
 * @see {@link SmokeMachineScriptEvent}
 * @todo Might need `*Pkg*`-type events here.
 */
import {
  type PkgManagerRunScriptsBeginEventData,
  type PkgManagerRunScriptsFailedEventData,
  type PkgManagerRunScriptsOkEventData,
  type RunScriptBeginEventData,
  type RunScriptErrorEventData,
  type RunScriptFailedEventData,
  type RunScriptOkEventData,
  type RunScriptResultEventData,
  type RunScriptSkippedEventData,
  type ScriptEvents,
} from '#event/script-events';

import {type MachineEvent} from './common.js';

/**
 * These fields are omitted from the `*PkgManager*` events because they are
 * computed by the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
export type ComputedPkgManagerRunScriptsFields =
  | 'totalPkgManagers'
  | 'totalScripts';

/**
 * These fields are emitted from the `*RunScript*` events because they are
 * computed by the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
export type ComputedRunScriptFields = 'totalScripts';

/**
 * Received from `PkgManagerMachine` when it begins running scripts.
 *
 * @event
 */
export type SmokeMachinePkgManagerRunScriptsBeginEvent = MachineEvent<
  typeof ScriptEvents.PkgManagerRunScriptsBegin,
  Omit<PkgManagerRunScriptsBeginEventData, ComputedPkgManagerRunScriptsFields>
>;

/**
 * Received from `PkgManagerMachine` when a script failed.
 *
 * @event
 */
export type SmokeMachinePkgManagerRunScriptsFailedEvent = MachineEvent<
  typeof ScriptEvents.PkgManagerRunScriptsFailed,
  Omit<PkgManagerRunScriptsFailedEventData, ComputedPkgManagerRunScriptsFields>
>;

/**
 * Received from `PkgManagerMachine` when all scripts have run successfully.
 */
export type SmokeMachinePkgManagerRunScriptsOkEvent = MachineEvent<
  typeof ScriptEvents.PkgManagerRunScriptsOk,
  Omit<PkgManagerRunScriptsOkEventData, ComputedPkgManagerRunScriptsFields>
>;

/**
 * Received from `PkgManagerMachine` when it begins running a script.
 */
export type SmokeMachineRunScriptBeginEvent = MachineEvent<
  typeof ScriptEvents.RunScriptBegin,
  Omit<RunScriptBeginEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script ends (regardless of success).
 *
 * @event
 */
export type SmokeMachineRunScriptEndEvent = MachineEvent<
  typeof ScriptEvents.RunScriptEnd,
  Omit<RunScriptResultEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script errors (e.g., cannot be found
 * or otherwise cannot be run)
 *
 * @event
 */
export type SmokeMachineRunScriptErrorEvent = MachineEvent<
  typeof ScriptEvents.RunScriptError,
  Omit<RunScriptErrorEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script failed.
 *
 * @event
 */
export type SmokeMachineRunScriptFailedEvent = MachineEvent<
  typeof ScriptEvents.RunScriptFailed,
  Omit<RunScriptFailedEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script runs successfully.
 *
 * @event
 */
export type SmokeMachineRunScriptOkEvent = MachineEvent<
  typeof ScriptEvents.RunScriptOk,
  Omit<RunScriptOkEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script is skipped.
 *
 * @event
 */
export type SmokeMachineRunScriptSkippedEvent = MachineEvent<
  typeof ScriptEvents.RunScriptSkipped,
  Omit<RunScriptSkippedEventData, ComputedRunScriptFields>
>;

/**
 * Script-related events received by `SmokeMachine`.
 *
 * @event
 */
export type SmokeMachineScriptEvent =
  | SmokeMachinePkgManagerRunScriptsBeginEvent
  | SmokeMachinePkgManagerRunScriptsFailedEvent
  | SmokeMachinePkgManagerRunScriptsOkEvent
  | SmokeMachineRunScriptBeginEvent
  | SmokeMachineRunScriptEndEvent
  | SomeSmokeMachineRunScriptResultEvent;

/**
 * A union of all possible events that can be received by `SmokeMachine` when a
 * script run ends.
 *
 * @event
 */
export type SomeSmokeMachineRunScriptResultEvent =
  | SmokeMachineRunScriptErrorEvent
  | SmokeMachineRunScriptFailedEvent
  | SmokeMachineRunScriptOkEvent
  | SmokeMachineRunScriptSkippedEvent;
