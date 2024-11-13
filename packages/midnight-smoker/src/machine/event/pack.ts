/**
 * Pack-related events received by `SmokeMachine`.
 *
 * These events are views into the public events as seen in
 * {@link PackEventData}.
 *
 * @remarks
 * `SmokeMachine` does not listen for each event individually; instead it
 * listens for `PACK.*` events
 * @packageDocumentation
 * @see {@link SmokeMachinePackEvent}
 */
import {
  type PackEvents,
  type PkgManagerPackBeginEventData,
  type PkgManagerPackFailedEventData,
  type PkgManagerPackOkEventData,
  type PkgPackBeginEventData,
  type PkgPackFailedEventData,
  type PkgPackOkEventData,
} from '#event/pack-events';
import {type Except} from 'type-fest';

import {
  type ComputedPkgEventField,
  type ComputedPkgManagerEventField,
  type MachineEvent,
} from './common';

/**
 * Pack-related events received by `SmokeMachine`
 *
 * @event
 */
export type SmokeMachinePackEvent =
  | SmokeMachinePkgManagerPackBeginEvent
  | SmokeMachinePkgManagerPackFailedEvent
  | SmokeMachinePkgManagerPackOkEvent
  | SmokeMachinePkgPackBeginEvent
  | SmokeMachinePkgPackFailedEvent
  | SmokeMachinePkgPackOkEvent;

/**
 * Received from `PkgManagerMachine` when packing begins.
 *
 * @event
 */
export type SmokeMachinePkgManagerPackBeginEvent = MachineEvent<
  typeof PackEvents.PkgManagerPackBegin,
  Omit<PkgManagerPackBeginEventData, ComputedPkgManagerEventField>
>;

/**
 * Received from `PkgManagerMachine` when packing fails.
 *
 * **Note**: This should be considered a fatal error.
 *
 * @event
 */
export type SmokeMachinePkgManagerPackFailedEvent = MachineEvent<
  typeof PackEvents.PkgManagerPackFailed,
  Omit<PkgManagerPackFailedEventData, ComputedPkgManagerEventField>
>;

/**
 * Received from `PkgManagerMachine` when packing succeeds.
 *
 * @event
 */
export type SmokeMachinePkgManagerPackOkEvent = MachineEvent<
  typeof PackEvents.PkgManagerPackOk,
  Omit<PkgManagerPackOkEventData, ComputedPkgManagerEventField>
>;

/**
 * Received from `PkgManagerMachine` when a discrete pack begins.
 *
 * @event
 */
export type SmokeMachinePkgPackBeginEvent = MachineEvent<
  typeof PackEvents.PkgPackBegin,
  Except<
    PkgPackBeginEventData,
    ComputedPkgEventField,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when a discrete pack fails.
 *
 * @event
 */
export type SmokeMachinePkgPackFailedEvent = MachineEvent<
  typeof PackEvents.PkgPackFailed,
  Except<
    PkgPackFailedEventData,
    ComputedPkgEventField,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when a discrete pack succeeds.
 *
 * @event
 */
export type SmokeMachinePkgPackOkEvent = MachineEvent<
  typeof PackEvents.PkgPackOk,
  Except<PkgPackOkEventData, ComputedPkgEventField, {requireExactProps: true}>
>;
