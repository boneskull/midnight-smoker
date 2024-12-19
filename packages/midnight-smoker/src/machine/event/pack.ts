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
 * @see {@link AnyPackMachineEvent}
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
 * Package-specific pack-related events
 *
 * @event
 */
export type AnyPkgManagerPackMachineEvent =
  | PkgManagerPackBeginMachineEvent
  | PkgManagerPackFailedMachineEvent
  | PkgManagerPackOkMachineEvent;

/**
 * `PkgManager`-specific pack-related events
 *
 * @event
 */
export type AnyPkgPackMachineEvent =
  | PkgPackBeginMachineEvent
  | PkgPackFailedMachineEvent
  | PkgPackOkMachineEvent;

/**
 * Pack-related events received by `SmokeMachine`
 *
 * @event
 */
export type AnyPackMachineEvent =
  | AnyPkgManagerPackMachineEvent
  | AnyPkgPackMachineEvent;

/**
 * Received from `PkgManagerMachine` when packing begins.
 *
 * @event
 */
export type PkgManagerPackBeginMachineEvent = MachineEvent<
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
export type PkgManagerPackFailedMachineEvent = MachineEvent<
  typeof PackEvents.PkgManagerPackFailed,
  Omit<PkgManagerPackFailedEventData, ComputedPkgManagerEventField>
>;

/**
 * Received from `PkgManagerMachine` when packing succeeds.
 *
 * @event
 */
export type PkgManagerPackOkMachineEvent = MachineEvent<
  typeof PackEvents.PkgManagerPackOk,
  Omit<PkgManagerPackOkEventData, ComputedPkgManagerEventField>
>;

/**
 * Received from `PkgManagerMachine` when a discrete pack begins.
 *
 * @event
 */
export type PkgPackBeginMachineEvent = MachineEvent<
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
export type PkgPackFailedMachineEvent = MachineEvent<
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
export type PkgPackOkMachineEvent = MachineEvent<
  typeof PackEvents.PkgPackOk,
  Except<PkgPackOkEventData, ComputedPkgEventField, {requireExactProps: true}>
>;
