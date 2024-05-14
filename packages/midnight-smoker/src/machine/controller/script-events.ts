import type {
  PkgManagerRunScriptsBeginEventData,
  PkgManagerRunScriptsFailedEventData,
  PkgManagerRunScriptsOkEventData,
} from '#event';
import type {
  RunScriptManifest,
  RunScriptResult,
  StaticPkgManagerSpec,
} from '../../component';

export type ComputedPkgManagerRunScriptsFields =
  | 'totalPkgManagers'
  | 'totalUniqueScripts'
  | 'totalUniquePkgs';

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

export interface CtrlRunScriptBeginEvent extends CtrlRunScriptEventBase {
  type: 'SCRIPT.RUN_SCRIPT_BEGIN';
}

export interface CtrlRunScriptEventBase {
  pkgManager: StaticPkgManagerSpec;
  pkgManagerIndex: number;
  runScriptManifest: RunScriptManifest;
  scriptIndex: number;
}

export interface CtrlRunScriptFailedEvent extends CtrlRunScriptEventBase {
  result: RunScriptResult;
  type: 'SCRIPT.RUN_SCRIPT_FAILED';
}

export interface CtrlRunScriptOkEvent extends CtrlRunScriptEventBase {
  result: RunScriptResult;
  type: 'SCRIPT.RUN_SCRIPT_OK';
}

export interface CtrlRunScriptSkippedEvent extends CtrlRunScriptEventBase {
  result: RunScriptResult;
  type: 'SCRIPT.RUN_SCRIPT_SKIPPED';
}

export type CtrlScriptEvents =
  | CtrlPkgManagerRunScriptsBeginEvent
  | CtrlPkgManagerRunScriptsOkEvent
  | CtrlPkgManagerRunScriptsFailedEvent
  | CtrlRunScriptBeginEvent
  | CtrlRunScriptOkEvent
  | CtrlRunScriptFailedEvent
  | CtrlRunScriptSkippedEvent;

export interface AnyScriptEvent {
  type: 'SCRIPT.*' &
    'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN' &
    'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED' &
    'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK' &
    'SCRIPT.RUN_SCRIPT_BEGIN' &
    'SCRIPT.RUN_SCRIPT_FAILED' &
    'SCRIPT.RUN_SCRIPT_OK' &
    'SCRIPT.RUN_SCRIPT_SKIPPED';
}
