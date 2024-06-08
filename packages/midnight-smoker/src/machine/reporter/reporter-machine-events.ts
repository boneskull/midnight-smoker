import {type SomeDataForEvent} from '#event/events';

export type ReporterMachineEvents =
  | ReporterMachineCtrlEvent
  | ReporterMachineAbortEvent
  | ReporterMachineHaltEvent;

export interface ReporterMachineCtrlEvent {
  event: SomeDataForEvent;
  type: 'EVENT';
}

export interface ReporterMachineHaltEvent {
  type: 'HALT';
}

export interface ReporterMachineAbortEvent {
  type: 'ABORT';
}
