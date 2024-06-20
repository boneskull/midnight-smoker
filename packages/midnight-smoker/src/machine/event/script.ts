/**
 * Script-related events received by `SmokeMachine`.
 *
 * These events are views into the public events as seen in {@link ScriptEvent}.
 *
 * @remarks
 * `SmokeMachine` does not listen for each event individually; instead it
 * listens for `SCRIPT.*` events
 * @packageDocumentation
 * @see {@link SmokeMachineScriptEvent}
 * @todo Might need `*Pkg*`-type events here.
 */
import type * as ScriptEvent from '#event/script-events';
import {type MachineEvent} from '#machine/util';

/**
 * These fields are omitted from the `*PkgManager*` events because they are
 * computed by the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
export type ComputedPkgManagerRunScriptsFields =
  | 'totalScripts'
  | 'totalPkgManagers';

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
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
  Omit<
    ScriptEvent.PkgManagerRunScriptsBeginEventData,
    ComputedPkgManagerRunScriptsFields
  >
>;

/**
 * Received from `PkgManagerMachine` when a script failed.
 *
 * @event
 */
export type SmokeMachinePkgManagerRunScriptsFailedEvent = MachineEvent<
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED',
  Omit<
    ScriptEvent.PkgManagerRunScriptsFailedEventData,
    ComputedPkgManagerRunScriptsFields
  >
>;

/**
 * Received from `PkgManagerMachine` when all scripts have run successfully.
 */
export type SmokeMachinePkgManagerRunScriptsOkEvent = MachineEvent<
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK',
  Omit<
    ScriptEvent.PkgManagerRunScriptsOkEventData,
    ComputedPkgManagerRunScriptsFields
  >
>;

/**
 * Received from `PkgManagerMachine` when it begins running a script.
 */
export type SmokeMachineRunScriptBeginEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_BEGIN',
  Omit<ScriptEvent.RunScriptBeginEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script ends (regardless of success).
 *
 * @event
 */
export type SmokeMachineRunScriptEndEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_END',
  Omit<ScriptEvent.RunScriptEndEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script errors (e.g., cannot be found
 * or otherwise cannot be run)
 *
 * @event
 */
export type SmokeMachineRunScriptErrorEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_ERROR',
  Omit<ScriptEvent.RunScriptErrorEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script failed.
 *
 * @event
 */
export type SmokeMachineRunScriptFailedEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_FAILED',
  Omit<ScriptEvent.RunScriptFailedEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script runs successfully.
 *
 * @event
 */
export type SmokeMachineRunScriptOkEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_OK',
  Omit<ScriptEvent.RunScriptOkEventData, ComputedRunScriptFields>
>;

/**
 * Received from `PkgManagerMachine` when a script is skipped.
 *
 * @event
 */
export type SmokeMachineRunScriptSkippedEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_SKIPPED',
  Omit<ScriptEvent.RunScriptSkippedEventData, ComputedRunScriptFields>
>;

/**
 * Script-related events received by `SmokeMachine`.
 *
 * @event
 */
export type SmokeMachineScriptEvent =
  | SmokeMachinePkgManagerRunScriptsBeginEvent
  | SmokeMachinePkgManagerRunScriptsOkEvent
  | SmokeMachinePkgManagerRunScriptsFailedEvent
  | SmokeMachineRunScriptBeginEvent
  | SmokeMachineRunScriptEndEvent
  | SomeSmokeMachineRunScriptEndEvent;

/**
 * A union of all possible events that can be received by `SmokeMachine` when a
 * script run ends.
 *
 * @event
 */
export type SomeSmokeMachineRunScriptEndEvent =
  | SmokeMachineRunScriptFailedEvent
  | SmokeMachineRunScriptOkEvent
  | SmokeMachineRunScriptSkippedEvent
  | SmokeMachineRunScriptErrorEvent;
