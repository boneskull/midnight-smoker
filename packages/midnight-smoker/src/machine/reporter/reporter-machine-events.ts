import {type CtrlEmitted} from '#machine/controller';

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
