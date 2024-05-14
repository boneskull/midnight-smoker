import {type DataForEvent, type EventData, type SmokerEvent} from '#event';
import {type LoaderMachineOutput} from '#machine/loader';
import {type PkgManagerMachineOutput} from '#machine/pkg-manager';
import {type ReporterMachineOutput} from '#machine/reporter';
import {type AnyInstallEvent, type CtrlInstallEvents} from './install-events';
import {type AnyLintEvent, type CtrlLintEvents} from './lint-events';
import {type AnyPackEvent, type CtrlPackEvents} from './pack-events';
import {type AnyScriptEvent, type CtrlScriptEvents} from './script-events';

export type ComputedPkgEventFields = 'currentPkg' | 'totalPkgs';

export type EventMap = {
  'SCRIPT.RUN_SCRIPT_BEGIN': typeof SmokerEvent.RunScriptBegin;
  'SCRIPT.RUN_SCRIPT_FAILED': typeof SmokerEvent.RunScriptFailed;
  'SCRIPT.RUN_SCRIPT_OK': typeof SmokerEvent.RunScriptOk;
  'SCRIPT.RUN_SCRIPT_SKIPPED': typeof SmokerEvent.RunScriptSkipped;
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_BEGIN': typeof SmokerEvent.PkgManagerRunScriptsBegin;
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_FAILED': typeof SmokerEvent.PkgManagerRunScriptsFailed;
  'SCRIPT.PKG_MANAGER_RUN_SCRIPTS_OK': typeof SmokerEvent.PkgManagerRunScriptsOk;
  'PACK.PKG_PACK_BEGIN': typeof SmokerEvent.PkgPackBegin;
  'PACK.PKG_PACK_FAILED': typeof SmokerEvent.PkgPackFailed;
  'PACK.PKG_PACK_OK': typeof SmokerEvent.PkgPackOk;
  'PACK.PKG_MANAGER_PACK_BEGIN': typeof SmokerEvent.PkgManagerPackBegin;
  'PACK.PKG_MANAGER_PACK_FAILED': typeof SmokerEvent.PkgManagerPackFailed;
  'PACK.PKG_MANAGER_PACK_OK': typeof SmokerEvent.PkgManagerPackOk;
  'INSTALL.PKG_MANAGER_INSTALL_BEGIN': typeof SmokerEvent.PkgManagerInstallBegin;
  'INSTALL.PKG_MANAGER_INSTALL_FAILED': typeof SmokerEvent.PkgManagerInstallFailed;
  'INSTALL.PKG_MANAGER_INSTALL_OK': typeof SmokerEvent.PkgManagerInstallOk;
  'INSTALL.PKG_INSTALL_BEGIN': typeof SmokerEvent.PkgInstallBegin;
  'INSTALL.PKG_INSTALL_FAILED': typeof SmokerEvent.PkgInstallFailed;
  'INSTALL.PKG_INSTALL_OK': typeof SmokerEvent.PkgInstallOk;
  'LINT.RULE_BEGIN': typeof SmokerEvent.RuleBegin;
  'LINT.RULE_FAILED': typeof SmokerEvent.RuleFailed;
  'LINT.RULE_OK': typeof SmokerEvent.RuleOk;
  'LINT.RULE_ERROR': typeof SmokerEvent.RuleError;
  'LINT.PKG_MANAGER_LINT_BEGIN': typeof SmokerEvent.PkgManagerLintBegin;
  'LINT.PKG_MANAGER_LINT_FAILED': typeof SmokerEvent.PkgManagerLintFailed;
  'LINT.PKG_MANAGER_LINT_OK': typeof SmokerEvent.PkgManagerLintOk;
};

export type BusEvent =
  | CtrlInstallEvents
  | CtrlLintEvents
  | CtrlPackEvents
  | CtrlScriptEvents;

export type ToSmokerEvent<T extends BusEvent> = DataForEvent<
  EventMap[T['type']]
>;

export type CtrlEvents =
  | AnyInstallEvent
  | AnyLintEvent
  | AnyPackEvent
  | AnyScriptEvent
  | CtrlHaltEvent
  | CtrlInstallEvents
  | CtrlLingeredEvent
  | CtrlLintEvents
  | CtrlLoaderMachineDoneEvent
  | CtrlPackEvents
  | CtrlPkgManagerMachineDoneEvent
  | CtrlReporterDoneEvent
  | CtrlScriptEvents
  | VerbatimEventData;

export type CtrlMachineEmitted = DataForEvent<keyof EventData>;

/**
 * These events are emitted by the bus machines, and are identical to the "real"
 * events emitted by midnight-smoker.
 */
export type VerbatimEventData = DataForEvent<VerbatimEventNames>;

export type VerbatimEventNames =
  | typeof SmokerEvent.LintOk
  | typeof SmokerEvent.LintFailed
  | typeof SmokerEvent.PackOk
  | typeof SmokerEvent.PackFailed
  | typeof SmokerEvent.InstallOk
  | typeof SmokerEvent.InstallFailed
  | typeof SmokerEvent.RunScriptsFailed
  | typeof SmokerEvent.RunScriptsOk;

export interface CtrlHaltEvent {
  type: 'HALT';
}

export interface CtrlLingeredEvent {
  directory: string;
  type: 'LINGERED';
}

export interface CtrlLoaderMachineDoneEvent {
  output: LoaderMachineOutput;
  type: 'xstate.done.actor.LoaderMachine.*';
}

export interface CtrlPkgManagerMachineDoneEvent {
  output: PkgManagerMachineOutput;
  type: 'xstate.done.actor.PkgManagerMachine.*';
}

export interface CtrlReporterDoneEvent {
  output: ReporterMachineOutput;
  type: 'xstate.done.actor.ReporterMachine.*';
}
