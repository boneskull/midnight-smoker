import {type SomeDataForEvent} from '#event/events';

export type ReporterMachineEvents =
  | ReporterMachineCtrlEvent
  | ReporterMachineHaltEvent;

export interface ReporterMachineCtrlEvent {
  event: SomeDataForEvent;
  type: 'EVENT';
}

export interface ReporterMachineHaltEvent {
  type: 'HALT';
}
