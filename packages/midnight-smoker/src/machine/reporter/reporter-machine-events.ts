import {type ControlMachineEmitted} from '#machine/controller';

export type ReporterMachineEvents =
  | ReporterMachineCtrlEvent
  | ReporterMachineHaltEvent;

export interface ReporterMachineCtrlEvent {
  event: ControlMachineEmitted;
  type: 'EVENT';
}

export interface ReporterMachineHaltEvent {
  type: 'HALT';
}
