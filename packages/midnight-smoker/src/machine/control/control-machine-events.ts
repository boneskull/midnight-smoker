import {type SmokerEvent} from '#event/event-constants';
import {type DataForEvent} from '#event/events';
import {type LoaderMachineOutput} from '#machine/loader';
import {type PkgManagerMachineOutput} from '#machine/pkg-manager';
import {type ReporterMachineOutput} from '#machine/reporter';
import {type CtrlInstallEvents} from './install-events';
import {type CtrlLintEvents} from './lint-events';
import {type CtrlPackEvents} from './pack-events';
import {type CtrlScriptEvents} from './script-events';
import {type CtrlSmokerEvents} from './smoker-events';

export type CtrlEvents =
  | CtrlInstallEvents
  | CtrlHaltEvent
  | CtrlSmokerEvents
  | CtrlLintEvents
  | CtrlLoaderMachineDoneEvent
  | CtrlPackEvents
  | CtrlPkgManagerMachineDoneEvent
  | CtrlReporterMachineDoneEvent
  | CtrlScriptEvents
  | VerbatimEvents;

export type CtrlMachineEmitted = DataForEvent<
  | typeof SmokerEvent.Lingered
  | typeof SmokerEvent.BeforeExit
  | typeof SmokerEvent.SmokeBegin
  | typeof SmokerEvent.SmokeOk
  | typeof SmokerEvent.SmokeFailed
  | typeof SmokerEvent.SmokeError
>;

/**
 * These events are emitted by the bus machines, and are identical to the "real"
 * events emitted by midnight-smoker.
 */
export type VerbatimEvents = DataForEvent<VerbatimEventNames>;

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

export interface CtrlLoaderMachineDoneEvent {
  output: LoaderMachineOutput;
  type: 'xstate.done.actor.LoaderMachine.*';
}

export interface CtrlPkgManagerMachineDoneEvent {
  output: PkgManagerMachineOutput;
  type: 'xstate.done.actor.PkgManagerMachine.*';
}

export interface CtrlReporterMachineDoneEvent {
  output: ReporterMachineOutput;
  type: 'xstate.done.actor.ReporterMachine.*';
}
