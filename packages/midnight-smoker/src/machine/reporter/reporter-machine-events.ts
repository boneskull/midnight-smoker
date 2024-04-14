import {type CtrlEmitted} from '../controller/control-machine-events';

export type ReporterMachineEvents =
  | ReporterMachineCtrlEvent
  | ReporterMachineHaltEvent;

export interface ReporterMachineCtrlEvent {
  event: CtrlEmitted;
  type: 'EVENT';
}

export interface ReporterMachineHaltEvent {
  type: 'HALT';
}
