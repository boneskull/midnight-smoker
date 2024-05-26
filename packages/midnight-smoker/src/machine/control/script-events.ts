import type {
  PkgManagerRunScriptsBeginEventData,
  PkgManagerRunScriptsFailedEventData,
  PkgManagerRunScriptsOkEventData,
  RunScriptBeginEventData,
  RunScriptErrorEventData,
  RunScriptFailedEventData,
  RunScriptOkEventData,
  RunScriptSkippedEventData,
} from '#event/script-events';
import {type MachineEvent} from '#machine/util';

export type AnyScriptEvent = CtrlScriptEvents & {type: 'SCRIPT.*'};

export type ComputedPkgManagerRunScriptsFields =
  | 'totalPkgManagers'
  | 'totalUniqueScripts'
  | 'totalUniquePkgs';

export type ComputedRunScriptFields = 'totalUniqueScripts';

export type CtrlRunScriptBeginEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_BEGIN',
  Omit<RunScriptBeginEventData, ComputedRunScriptFields>
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

export type CtrlRunScriptErrorEvent = MachineEvent<
  'SCRIPT.RUN_SCRIPT_ERROR',
  Omit<RunScriptErrorEventData, ComputedRunScriptFields>
>;

export type CtrlScriptEvents =
  | CtrlPkgManagerRunScriptsBeginEvent
  | CtrlPkgManagerRunScriptsOkEvent
  | CtrlPkgManagerRunScriptsFailedEvent
  | CtrlRunScriptBeginEvent
  | CtrlRunScriptOkEvent
  | CtrlRunScriptFailedEvent
  | CtrlRunScriptSkippedEvent;

export interface CtrlPkgManagerRunScriptsBeginEvent
  extends Omit<
    PkgManagerRunScriptsBeginEventData,
    ComputedPkgManagerRunScriptsFields
  > {
  type: 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN';
}

export interface CtrlPkgManagerRunScriptsFailedEvent
  extends Omit<
    PkgManagerRunScriptsFailedEventData,
    ComputedPkgManagerRunScriptsFields
  > {
  type: 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED';
}

export interface CtrlPkgManagerRunScriptsOkEvent
  extends Omit<
    PkgManagerRunScriptsOkEventData,
    ComputedPkgManagerRunScriptsFields
  > {
  type: 'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK';
}
