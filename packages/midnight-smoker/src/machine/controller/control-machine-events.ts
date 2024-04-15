import {type InstallError, type PackError, type PackParseError} from '#error';
import {type PkgManager} from '#pkg-manager';
import {
  type InstallEventData,
  type InstallManifest,
  type LintEventData,
  type PackEventData,
  type PackOptions,
  type PkgManagerLintBeginEventData,
  type PkgManagerLintFailedEventData,
  type PkgManagerLintOkEventData,
  type PkgManagerRunScriptsBeginEventData,
  type RuleBeginEventData,
  type RuleFailedEventData,
  type RuleOkEventData,
  type RunScriptManifest,
  type RunScriptResult,
  type ScriptEventData,
  type SmokerEventData,
} from '#schema';
import {type Simplify, type ValueOf} from 'type-fest';
import {type InstallerMachineOutput} from '../installer/installer-machine';
import {type PackerMachineOutput} from '../packer/packer-machine';
import {type PluginLoaderOutput} from '../plugin-loader-machine';
import {type ReporterMachineOutput} from '../reporter/reporter-machine';
import {type RunnerMachineOutput} from '../runner/runner-machine';

export type CtrlEvents =
  | CtrlRunScriptSkippedEvent
  | CtrlRunScriptFailedEvent
  | CtrlRunScriptOkEvent
  | CtrlRunScriptsOkEvent
  | CtrlHaltEvent
  | CtrlInitEvent
  | CtrlLoadedEvent
  | CtrlLintEvent
  | CtrlPkgManagerInstallFailedEvent
  | CtrlPkgManagerInstallOkEvent
  | CtrlPkgManagerPackFailedEvent
  | CtrlPkgManagerPackOkEvent
  | CtrlPkgManagerInstallBeginEvent
  | CtrlPkgManagerPackBeginEvent
  | CtrlPluginLoaderDoneEvent
  | CtrlRunScriptsEvent
  | CtrlRunScriptBeginEvent
  | CtrlReporterDoneEvent
  | CtrlRunScriptsBeginEvent
  | CtrlRuleFailedEvent
  | CtrlRuleOkEvent
  | CtrlSetupEvent
  | CtrlInstallBeginEvent
  | CtrlPackBeginEvent
  | CtrlInstallerMachineDoneEvent
  | CtrlPackerMachineDoneEvent
  | CtrlPkgManagerRunScriptsBeginEvent
  | CtrlPkgManagerRunScriptsOkEvent
  | CtrlPkgManagerRunScriptsFailedEvent
  | CtrlLintOkEvent
  | CtrlLintFailedEvent
  | CtrlLintBeginEvent
  | CtrlRuleErrorEvent
  | CtrlPkgManagerLintBeginEvent
  | CtrlPkgManagerLintOkEvent
  | CtrlPkgManagerLintFailedEvent
  | CtrlRunnerMachineDoneEvent;

type SourceEvents = InstallEventData &
  PackEventData &
  ScriptEventData &
  LintEventData &
  Pick<
    SmokerEventData,
    'BeforeExit' | 'SmokeBegin' | 'SmokeOk' | 'SmokeFailed'
  >;

export type CtrlExternalEventsMap = {
  [K in keyof SourceEvents]: SourceEvents[K] & {type: K};
};

export type CtrlEmitted = ValueOf<CtrlExternalEventsMap>;

export type CtrlExternalEvent<K extends keyof CtrlExternalEventsMap> = Simplify<
  CtrlExternalEventsMap[K]
>;

export type ComputedPkgManagerRunScriptsFields =
  | 'totalPkgManagers'
  | 'totalUniqueScripts'
  | 'totalUniquePkgs';

export interface CtrlPkgManagerRunScriptsBeginEvent
  extends Omit<
    PkgManagerRunScriptsBeginEventData,
    ComputedPkgManagerRunScriptsFields
  > {
  type: 'PKG_MANAGER_RUN_SCRIPTS_BEGIN';
}

export interface CtrlLintEvent {
  type: 'LINT';
}

export interface CtrlPackBeginEvent {
  type: 'PACK_BEGIN';
}

export interface CtrlInstallBeginEvent {
  type: 'INSTALL_BEGIN';
}

export interface CtrlRunScriptEventBase {
  pkgManagerIndex: number;
  runScriptManifest: RunScriptManifest;
  scriptIndex: number;
  pkgManager: PkgManager;
}

export interface CtrlRunScriptSkippedEvent extends CtrlRunScriptEventBase {
  type: 'RUN_SCRIPT_SKIPPED';
  result: RunScriptResult;
}

export interface CtrlRunScriptFailedEvent extends CtrlRunScriptEventBase {
  type: 'RUN_SCRIPT_FAILED';
  result: RunScriptResult;
}

export interface CtrlRunScriptOkEvent extends CtrlRunScriptEventBase {
  type: 'RUN_SCRIPT_OK';
  result: RunScriptResult;
}

export interface CtrlRunScriptsBeginEvent {
  type: 'RUN_SCRIPTS_BEGIN';
}

export interface CtrlRunScriptsOkEvent {
  type: 'RUN_SCRIPTS_OK';
}

export interface CtrlRunScriptsFailedEvent {
  type: 'RUN_SCRIPTS_FAILED';
}

export interface CtrlHaltEvent {
  type: 'HALT';
}

export interface CtrlInitEvent {
  type: 'INIT';
}

export interface CtrlLoadedEvent {
  pkgManagers: PkgManager[];
  type: 'LOADED';
}

export interface CtrlReporterDoneEvent {
  type: 'xstate.done.actor.ReporterMachine.*';
  output: ReporterMachineOutput;
}

export interface CtrlPkgManagerInstallOkEvent {
  index: number;
  installManifests: InstallManifest[];
  pkgManager: PkgManager;
  type: 'PKG_MANAGER_INSTALL_OK';
  sender: string;
}

export interface CtrlPkgManagerInstallFailedEvent {
  error: InstallError;
  index: number;
  pkgManager: PkgManager;
  type: 'PKG_MANAGER_INSTALL_FAILED';
  sender: string;
  installManifests: InstallManifest[];
}

export interface CtrlPkgManagerPackFailedEvent {
  error: PackError | PackParseError;
  index: number;
  pkgManager: PkgManager;
  type: 'PKG_MANAGER_PACK_FAILED';
  sender: string;
}

export interface CtrlSetupEvent {
  type: 'SETUP';
  pkgManager: PkgManager;
}

export interface CtrlPkgManagerPackOkEvent {
  index: number;
  installManifests: InstallManifest[];
  pkgManager: PkgManager;
  type: 'PKG_MANAGER_PACK_OK';

  sender: string;
}

export interface CtrlPkgManagerInstallBeginEvent {
  index: number;
  pkgManager: PkgManager;
  installManifests: InstallManifest[];
  type: 'PKG_MANAGER_INSTALL_BEGIN';
  sender: string;
}

export interface CtrlPkgManagerPackBeginEvent extends PackOptions {
  index: number;
  pkgManager: PkgManager;
  sender: string;
  type: 'PKG_MANAGER_PACK_BEGIN';
}

export interface CtrlPluginLoaderDoneEvent {
  output: PluginLoaderOutput;
  type: 'xstate.done.actor.PluginLoader.*';
}

export interface CtrlInstallerMachineDoneEvent {
  type: 'xstate.done.actor.InstallerMachine';
  output: InstallerMachineOutput;
}

export interface CtrlPackerMachineDoneEvent {
  type: 'xstate.done.actor.PackerMachine';
  output: PackerMachineOutput;
}

export interface CtrlRunnerMachineDoneEvent {
  type: 'xstate.done.actor.RunnerMachine.*';
  output: RunnerMachineOutput;
}

export interface CtrlRunScriptBeginEvent extends CtrlRunScriptEventBase {
  type: 'RUN_SCRIPT_BEGIN';
}

export interface CtrlRunScriptsEvent {
  scripts: string[];
  type: 'RUN_SCRIPTS';
}

export interface CtrlPkgManagerRunScriptsOkEvent {
  type: 'PKG_MANAGER_RUN_SCRIPTS_OK';
  sender: string;
}

export interface CtrlPkgManagerRunScriptsFailedEvent {
  type: 'PKG_MANAGER_RUN_SCRIPTS_FAILED';
  sender: string;
}

export type ComputedRuleEventFields = 'totalRules';

export interface CtrlRuleFailedEvent
  extends Omit<RuleFailedEventData, ComputedRuleEventFields> {
  type: 'RULE_FAILED';
}

export interface CtrlRuleOkEvent
  extends Omit<RuleOkEventData, ComputedRuleEventFields> {
  type: 'RULE_OK';
}

export interface CtrlRuleBeginEvent
  extends Omit<RuleBeginEventData, ComputedRuleEventFields> {
  type: 'RULE_BEGIN';
}

export interface CtrlLintOkEvent {
  type: 'LINT_OK';
}

export type ComputedPkgManagerLintFields =
  | 'totalPkgManagers'
  | 'totalRules'
  | 'totalPkgManagerChecks';

export interface CtrlPkgManagerLintBeginEvent
  extends Omit<PkgManagerLintBeginEventData, ComputedPkgManagerLintFields> {
  type: 'PKG_MANAGER_LINT_BEGIN';
}

export interface CtrlPkgManagerLintOkEvent
  extends Omit<PkgManagerLintOkEventData, ComputedPkgManagerLintFields> {
  type: 'PKG_MANAGER_LINT_OK';
}

export interface CtrlPkgManagerLintFailedEvent
  extends Omit<PkgManagerLintFailedEventData, ComputedPkgManagerLintFields> {
  type: 'PKG_MANAGER_LINT_FAILED';
}

export interface CtrlLintFailedEvent {
  type: 'LINT_FAILED';
}

export interface CtrlLintBeginEvent {
  type: 'LINT_BEGIN';
}

export interface CtrlRuleErrorEvent {
  type: 'RULE_ERROR';
}
