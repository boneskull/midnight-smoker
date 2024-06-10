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
import {type Simplify} from 'type-fest';

export type ComputedPkgManagerRunScriptsFields =
  | 'totalScripts'
  | 'totalPkgManagers';

export type ComputedRunScriptFields = 'totalScripts';

export type CtrlPkgManagerRunScriptsBeginEvent = Simplify<
  MachineEvent<
    'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN',
    Omit<PkgManagerRunScriptsBeginEventData, ComputedPkgManagerRunScriptsFields>
  >
>;

export type CtrlPkgManagerRunScriptsFailedEvent = Simplify<
  MachineEvent<
    'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED',
    Omit<
      PkgManagerRunScriptsFailedEventData,
      ComputedPkgManagerRunScriptsFields
    >
  >
>;

export type CtrlPkgManagerRunScriptsOkEvent = Simplify<
  MachineEvent<
    'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK',
    Omit<PkgManagerRunScriptsOkEventData, ComputedPkgManagerRunScriptsFields>
  >
>;

export type CtrlRunScriptBeginEvent = Simplify<
  MachineEvent<
    'SCRIPT.RUN_SCRIPT_BEGIN',
    Omit<RunScriptBeginEventData, ComputedRunScriptFields>
  >
>;

export type CtrlRunScriptEndEvent = Simplify<
  MachineEvent<
    'SCRIPT.RUN_SCRIPT_END',
    Omit<RunScriptEndEventData, ComputedRunScriptFields>
  >
>;

export type CtrlRunScriptErrorEvent = Simplify<
  MachineEvent<
    'SCRIPT.RUN_SCRIPT_ERROR',
    Omit<RunScriptErrorEventData, ComputedRunScriptFields>
  >
>;

export type CtrlRunScriptFailedEvent = Simplify<
  MachineEvent<
    'SCRIPT.RUN_SCRIPT_FAILED',
    Omit<RunScriptFailedEventData, ComputedRunScriptFields>
  >
>;

export type CtrlRunScriptOkEvent = Simplify<
  MachineEvent<
    'SCRIPT.RUN_SCRIPT_OK',
    Omit<RunScriptOkEventData, ComputedRunScriptFields>
  >
>;

export type CtrlRunScriptSkippedEvent = Simplify<
  MachineEvent<
    'SCRIPT.RUN_SCRIPT_SKIPPED',
    Omit<RunScriptSkippedEventData, ComputedRunScriptFields>
  >
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
