import {type SmokerEvent} from '#constants/event';
import {type DataForEvent} from '#event/events';
import {type PkgManagerMachineOutput} from '#machine/pkg-manager';
import {type PluginLoaderMachineOutput} from '#machine/plugin-loader-machine';
import {type ReporterMachineOutput} from '#machine/reporter';
import {type AbortEvent} from '#machine/util';
import {type CtrlInstallEvent} from './install';
import {type CtrlLintEvent} from './lint';
import {type CtrlPackEvents} from './pack';
import {type CtrlScriptEvents} from './script';
import {type CtrlSmokerEvents} from './smoker';
import {type VerbatimEvents} from './verbatim';

export type CtrlEvent =
  | CtrlInstallEvent
  | CtrlShutdownEvent
  | CtrlSmokerEvents
  | CtrlLintEvent
  | CtrlPluginLoaderMachineDoneEvent
  | CtrlPackEvents
  | CtrlPkgManagerMachineDoneEvent
  | CtrlReporterMachineDoneEvent
  | CtrlScriptEvents
  | VerbatimEvents
  | AbortEvent;

export interface CtrlShutdownEvent {
  type: 'SHUTDOWN';
}

export interface CtrlPluginLoaderMachineDoneEvent {
  output: PluginLoaderMachineOutput;
  type: 'xstate.done.actor.PluginLoaderMachine.*';
}

export interface CtrlPkgManagerMachineDoneEvent {
  output: PkgManagerMachineOutput;
  type: 'xstate.done.actor.PkgManagerMachine.*';
}

export interface CtrlReporterMachineDoneEvent {
  output: ReporterMachineOutput;
  type: 'xstate.done.actor.ReporterMachine.*';
}

export type CtrlEventEmitted = DataForEvent<
  | typeof SmokerEvent.Lingered
  | typeof SmokerEvent.BeforeExit
  | typeof SmokerEvent.SmokeBegin
  | typeof SmokerEvent.SmokeOk
  | typeof SmokerEvent.SmokeFailed
  | typeof SmokerEvent.SmokeError
  | typeof SmokerEvent.Aborted
>;
