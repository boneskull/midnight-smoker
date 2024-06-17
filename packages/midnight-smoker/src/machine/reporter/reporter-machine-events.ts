import {type SomeDataForEvent} from '#event/events';
import {type ReporterContext} from '#schema/reporter-context';
import {type Except} from 'type-fest';

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

export type PartialReporterContext = Except<ReporterContext, 'signal'>;
