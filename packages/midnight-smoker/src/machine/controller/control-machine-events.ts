import {type InstallError, type PackError, type PackParseError} from '#error';
import {
  type EventData,
  type Events,
  type PkgInstallBeginEventData,
  type PkgInstallFailedEventData,
  type PkgInstallOkEventData,
  type PkgManagerLintBeginEventData,
  type PkgManagerLintFailedEventData,
  type PkgManagerLintOkEventData,
  type PkgManagerRunScriptsBeginEventData,
  type PkgManagerRunScriptsFailedEventData,
  type PkgManagerRunScriptsOkEventData,
  type PkgPackBeginEventData,
  type PkgPackFailedEventData,
  type PkgPackOkEventData,
  type RuleBeginEventData,
  type RuleErrorEventData,
  type RuleFailedEventData,
  type RuleOkEventData,
} from '#event';
import {type LoaderMachineOutput} from '#machine/loader-machine';
import {type PkgManagerMachineOutput} from '#machine/pkg-manager';
import {type ReporterMachineOutput} from '#machine/reporter';
import {type MachineEvent} from '#machine/util';
import {
  type InstallManifest,
  type RunScriptManifest,
  type RunScriptResult,
  type StaticPkgManagerSpec,
  type WorkspaceInfo,
} from '#schema';

export type ComputedPkgEventFields = 'currentPkg' | 'totalPkgs';

export type ComputedPkgManagerLintFields = 'totalPkgManagers' | 'totalRules';

export type ComputedPkgManagerRunScriptsFields =
  | 'totalPkgManagers'
  | 'totalUniqueScripts'
  | 'totalUniquePkgs';

export type ComputedRuleEventFields = 'totalRules';

export type ControlMachineEmitted = EventData<keyof Events>;

export type CtrlEvents =
  | CtrlHaltEvent
  | CtrlInitEvent
  | CtrlInstallBeginEvent
  | CtrlInstallFailedEvent
  | CtrlInstallOkEvent
  | CtrlLintBeginEvent
  | CtrlLintEvent
  | CtrlLintFailedEvent
  | CtrlLintOkEvent
  | CtrlLoadedEvent
  | CtrlPackBeginEvent
  | CtrlPackFailedEvent
  | CtrlPackOkEvent
  | CtrlPkgManagerInstallBeginEvent
  | CtrlPkgManagerInstallFailedEvent
  | CtrlPkgManagerInstallOkEvent
  | CtrlPkgManagerLintBeginEvent
  | CtrlPkgManagerLintFailedEvent
  | CtrlPkgManagerLintOkEvent
  | CtrlPkgManagerPackBeginEvent
  | CtrlPkgManagerPackFailedEvent
  | CtrlPkgManagerPackOkEvent
  | CtrlPkgManagerReadyEvent
  | CtrlPkgManagerRunScriptsBeginEvent
  | CtrlPkgManagerRunScriptsFailedEvent
  | CtrlPkgManagerRunScriptsOkEvent
  | CtrlPkgInstallBeginEvent
  | CtrlPkgInstallOkEvent
  | CtrlPkgInstallFailedEvent
  | CtrlPkgPackBeginEvent
  | CtrlPkgPackFailedEvent
  | CtrlPkgPackOkEvent
  | CtrlReporterDoneEvent
  | CtrlRuleBeginEvent
  | CtrlRuleErrorEvent
  | CtrlRuleFailedEvent
  | CtrlRuleOkEvent
  | CtrlRunScriptBeginEvent
  | CtrlRunScriptFailedEvent
  | CtrlRunScriptOkEvent
  | CtrlRunScriptsBeginEvent
  | CtrlRunScriptsEvent
  | CtrlRunScriptSkippedEvent
  | CtrlRunScriptsOkEvent
  | CtrlSetupEvent
  | CtrlLingeredEvent
  | CtrlPkgManagerMachineDoneEvent
  | CtrlLoaderMachineDoneEvent;

export type CtrlPkgInstallBeginEvent = MachineEvent<
  'PKG_INSTALL_BEGIN',
  Omit<PkgInstallBeginEventData, ComputedPkgEventFields>
>;

export type CtrlPkgInstallFailedEvent = MachineEvent<
  'PKG_INSTALL_FAILED',
  Omit<PkgInstallFailedEventData, ComputedPkgEventFields>
>;

export type CtrlPkgInstallOkEvent = MachineEvent<
  'PKG_INSTALL_OK',
  Omit<PkgInstallOkEventData, ComputedPkgEventFields>
>;

export type CtrlPkgManagerLintBeginEvent = MachineEvent<
  'PKG_MANAGER_LINT_BEGIN',
  Omit<PkgManagerLintBeginEventData, ComputedPkgManagerLintFields>
>;

export type CtrlPkgManagerLintFailedEvent = MachineEvent<
  'PKG_MANAGER_LINT_FAILED',
  Omit<PkgManagerLintFailedEventData, ComputedPkgManagerLintFields>
>;

export type CtrlPkgManagerLintOkEvent = MachineEvent<
  'PKG_MANAGER_LINT_OK',
  Omit<PkgManagerLintOkEventData, ComputedPkgManagerLintFields>
>;

export type CtrlPkgPackBeginEvent = MachineEvent<
  'PKG_PACK_BEGIN',
  Omit<PkgPackBeginEventData, ComputedPkgEventFields>
>;

export type CtrlPkgPackFailedEvent = MachineEvent<
  'PKG_PACK_FAILED',
  Omit<PkgPackFailedEventData, ComputedPkgEventFields>
>;

export type CtrlPkgPackOkEvent = MachineEvent<
  'PKG_PACK_OK',
  Omit<PkgPackOkEventData, ComputedPkgEventFields>
>;

export interface CtrlHaltEvent {
  type: 'HALT';
}

export interface CtrlInitEvent {
  type: 'INIT';
}

export interface CtrlInstallBeginEvent {
  type: 'INSTALL_BEGIN';
}

export interface CtrlInstallFailedEvent {
  error: InstallError;
  type: 'INSTALL_FAILED';
}

export interface CtrlInstallOkEvent {
  type: 'INSTALL_OK';
}

export interface CtrlLingeredEvent {
  directory: string;
  type: 'LINGERED';
}

export interface CtrlLintBeginEvent {
  type: 'LINT_BEGIN';
}

export interface CtrlLintEvent {
  type: 'LINT';
}

export interface CtrlLintFailedEvent {
  type: 'LINT_FAILED';
}

export interface CtrlLintOkEvent {
  type: 'LINT_OK';
}

export interface CtrlLoadedEvent {
  pkgManagers: StaticPkgManagerSpec[];
  type: 'LOADED';
}

export interface CtrlPackBeginEvent {
  type: 'PACK_BEGIN';
}

export interface CtrlPackFailedEvent {
  error: PackError | PackParseError;
  type: 'PACK_FAILED';
}

export interface CtrlPackOkEvent {
  manifests: InstallManifest[];
  type: 'PACK_OK';
}

export interface CtrlPkgManagerInstallBeginEvent {
  index: number;
  installManifests: InstallManifest[];
  pkgManager: StaticPkgManagerSpec;
  sender: string;
  type: 'PKG_MANAGER_INSTALL_BEGIN';
}

export interface CtrlPkgManagerInstallFailedEvent {
  error: InstallError;
  index: number;
  installManifests: InstallManifest[];
  pkgManager: StaticPkgManagerSpec;
  sender: string;
  type: 'PKG_MANAGER_INSTALL_FAILED';
}

export interface CtrlPkgManagerInstallOkEvent {
  index: number;
  installManifests: InstallManifest[];
  pkgManager: StaticPkgManagerSpec;
  sender: string;
  type: 'PKG_MANAGER_INSTALL_OK';
}

export interface CtrlPkgManagerMachineDoneEvent {
  output: PkgManagerMachineOutput;
  type: 'xstate.done.actor.PkgManagerMachine.*';
}

export interface CtrlPkgManagerPackBeginEvent {
  index: number;
  pkgManager: StaticPkgManagerSpec;
  sender: string;
  type: 'PKG_MANAGER_PACK_BEGIN';
}

export interface CtrlPkgManagerPackFailedEvent {
  error: PackError | PackParseError;
  index: number;
  pkgManager: StaticPkgManagerSpec;
  sender: string;
  type: 'PKG_MANAGER_PACK_FAILED';
  workspaceInfo: WorkspaceInfo[];
}

export interface CtrlPkgManagerPackOkEvent {
  index: number;
  installManifests: InstallManifest[];
  pkgManager: StaticPkgManagerSpec;
  sender: string;
  type: 'PKG_MANAGER_PACK_OK';
  workspaceInfo: WorkspaceInfo[];
}

export interface CtrlPkgManagerReadyEvent {
  id: string;
  spec: StaticPkgManagerSpec;
  type: 'PKG_MANAGER_READY';
}

export interface CtrlPkgManagerRunScriptsBeginEvent
  extends Omit<
    PkgManagerRunScriptsBeginEventData,
    ComputedPkgManagerRunScriptsFields
  > {
  type: 'PKG_MANAGER_RUN_SCRIPTS_BEGIN';
}

export interface CtrlPkgManagerRunScriptsFailedEvent
  extends Omit<
    PkgManagerRunScriptsFailedEventData,
    ComputedPkgManagerRunScriptsFields
  > {
  type: 'PKG_MANAGER_RUN_SCRIPTS_FAILED';
}

export interface CtrlPkgManagerRunScriptsOkEvent
  extends Omit<
    PkgManagerRunScriptsOkEventData,
    ComputedPkgManagerRunScriptsFields
  > {
  type: 'PKG_MANAGER_RUN_SCRIPTS_OK';
}

export interface CtrlLoaderMachineDoneEvent {
  output: LoaderMachineOutput;
  type: 'xstate.done.actor.LoaderMachine.*';
}

export interface CtrlReporterDoneEvent {
  output: ReporterMachineOutput;
  type: 'xstate.done.actor.ReporterMachine.*';
}

export interface CtrlRuleBeginEvent
  extends Omit<RuleBeginEventData, ComputedRuleEventFields> {
  sender: string;
  type: 'RULE_BEGIN';
}

export interface CtrlRuleErrorEvent
  extends Omit<RuleErrorEventData, ComputedRuleEventFields> {
  type: 'RULE_ERROR';
}

export interface CtrlRuleFailedEvent
  extends Omit<RuleFailedEventData, ComputedRuleEventFields> {
  sender: string;
  type: 'RULE_FAILED';
}

export interface CtrlRuleOkEvent
  extends Omit<RuleOkEventData, ComputedRuleEventFields> {
  sender: string;
  type: 'RULE_OK';
}

export interface CtrlRunScriptBeginEvent extends CtrlRunScriptEventBase {
  type: 'RUN_SCRIPT_BEGIN';
}

export interface CtrlRunScriptEventBase {
  pkgManager: StaticPkgManagerSpec;
  pkgManagerIndex: number;
  runScriptManifest: RunScriptManifest;
  scriptIndex: number;
}

export interface CtrlRunScriptFailedEvent extends CtrlRunScriptEventBase {
  result: RunScriptResult;
  type: 'RUN_SCRIPT_FAILED';
}

export interface CtrlRunScriptOkEvent extends CtrlRunScriptEventBase {
  result: RunScriptResult;
  type: 'RUN_SCRIPT_OK';
}

export interface CtrlRunScriptSkippedEvent extends CtrlRunScriptEventBase {
  result: RunScriptResult;
  type: 'RUN_SCRIPT_SKIPPED';
}

export interface CtrlRunScriptsBeginEvent {
  type: 'RUN_SCRIPTS_BEGIN';
}

export interface CtrlRunScriptsEvent {
  scripts: string[];
  type: 'RUN_SCRIPTS';
}

export interface CtrlRunScriptsFailedEvent {
  type: 'RUN_SCRIPTS_FAILED';
}

export interface CtrlRunScriptsOkEvent {
  type: 'RUN_SCRIPTS_OK';
}

export interface CtrlSetupEvent {
  pkgManager: StaticPkgManagerSpec;
  type: 'SETUP';
}
