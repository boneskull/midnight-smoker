import {type CtrlMachineEmitted} from '#machine/control';

export type ReporterMachineEvents =
  | ReporterMachineCtrlEvent
  | ReporterMachineHaltEvent;

export interface ReporterMachineCtrlEvent {
  event: CtrlMachineEmitted;
  type: 'EVENT';
}

export interface ReporterMachineHaltEvent {
  type: 'HALT';
}
