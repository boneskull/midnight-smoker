import {type EventData, type Events, type SmokerEvent} from '#event';
import {type LoaderMachineOutput} from '#machine/loader-machine';
import {type PkgManagerMachineOutput} from '#machine/pkg-manager';
import {type ReporterMachineOutput} from '#machine/reporter';
import {type AnyInstallEvent, type CtrlInstallEvents} from './install-events';
import {type AnyLintEvent, type CtrlLintEvents} from './lint-events';
import {type AnyPackEvent, type CtrlPackEvents} from './pack-events';
import {type AnyScriptEvent, type CtrlScriptEvents} from './script-events';

export type ComputedPkgEventFields = 'currentPkg' | 'totalPkgs';

export type ComputedPkgManagerLintFields = 'totalPkgManagers' | 'totalRules';

export type ControlMachineEmitted = EventData<keyof Events>;

export type CtrlEvents =
  | CtrlHaltEvent
  | CtrlInstallEvents
  | CtrlPackEvents
  | CtrlLintEvents
  | CtrlScriptEvents
  | CtrlReporterDoneEvent
  | CtrlLingeredEvent
  | CtrlPkgManagerMachineDoneEvent
  | AnyPackEvent
  | AnyInstallEvent
  | AnyLintEvent
  | AnyScriptEvent
  | CtrlLoaderMachineDoneEvent
  | VerbatimEvents;

/**
 * These events are emitted by the bus machines, and are identical to the "real"
 * events emitted by midnight-smoker.
 */
export type VerbatimEvents =
  | EventData<typeof SmokerEvent.LintOk>
  | EventData<typeof SmokerEvent.LintFailed>
  | EventData<typeof SmokerEvent.PackOk>
  | EventData<typeof SmokerEvent.PackFailed>
  | EventData<typeof SmokerEvent.InstallOk>
  | EventData<typeof SmokerEvent.InstallFailed>
  | EventData<typeof SmokerEvent.RunScriptsFailed>
  | EventData<typeof SmokerEvent.RunScriptsOk>;

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
