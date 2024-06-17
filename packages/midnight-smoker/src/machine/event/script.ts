import type {
  PkgManagerRunScriptsBeginEventData,
  PkgManagerRunScriptsFailedEventData,
  PkgManagerRunScriptsOkEventData,
  RunScriptBeginEventData,
  RunScriptEndEventData,
  RunScriptErrorEventData,
  RunScriptFailedEventData,
  RunScriptOkEventData,
  RunScriptSkippedEventData,
} from '#event/script-events';
import {type MachineEvent} from '#machine/util';

export type ComputedPkgManagerRunScriptsFields =
  | 'totalScripts'
  | 'totalPkgManagers';

export type ComputedRunScriptFields = 'totalScripts';

export type CtrlPkgManagerRunScriptsBeginEvent = MachineEvent<
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
  Omit<PkgManagerRunScriptsBeginEventData, ComputedPkgManagerRunScriptsFields>
>;

export type CtrlPkgManagerRunScriptsFailedEvent = MachineEvent<
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED',
  Omit<PkgManagerRunScriptsFailedEventData, ComputedPkgManagerRunScriptsFields>
>;

export type CtrlPkgManagerRunScriptsOkEvent = MachineEvent<
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK',
  Omit<PkgManagerRunScriptsOkEventData, ComputedPkgManagerRunScriptsFields>
>;

export type CtrlRunScriptBeginEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_BEGIN',
  Omit<RunScriptBeginEventData, ComputedRunScriptFields>
>;

export type CtrlRunScriptEndEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_END',
  Omit<RunScriptEndEventData, ComputedRunScriptFields>
>;

export type CtrlRunScriptErrorEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_ERROR',
  Omit<RunScriptErrorEventData, ComputedRunScriptFields>
>;

export type CtrlRunScriptFailedEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_FAILED',
  Omit<RunScriptFailedEventData, ComputedRunScriptFields>
>;

export type CtrlRunScriptOkEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_OK',
  Omit<RunScriptOkEventData, ComputedRunScriptFields>
>;

export type CtrlRunScriptSkippedEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_SKIPPED',
  Omit<RunScriptSkippedEventData, ComputedRunScriptFields>
>;

export type SomeCtrlRunScriptEndEvent =
  | CtrlRunScriptFailedEvent
  | CtrlRunScriptOkEvent
  | CtrlRunScriptSkippedEvent
  | CtrlRunScriptErrorEvent;

export type CtrlScriptEvents =
  | CtrlPkgManagerRunScriptsBeginEvent
  | CtrlPkgManagerRunScriptsOkEvent
  | CtrlPkgManagerRunScriptsFailedEvent
  | CtrlRunScriptBeginEvent
  | CtrlRunScriptEndEvent
  | SomeCtrlRunScriptEndEvent;
