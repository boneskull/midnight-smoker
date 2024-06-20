/**
 * Pack-related events received by `SmokeMachine`.
 *
 * These events are views into the public events as seen in {@link PackEvent}.
 *
 * @remarks
 * `SmokeMachine` does not listen for each event individually; instead it
 * listens for `PACK.*` events
 * @packageDocumentation
 * @see {@link SmokeMachinePackEvent}
 */
import type * as PackEvent from '#event/pack-events';
import type {MachineEvent} from '#machine/util';
import {type ComputedPkgEventFields} from './pkg';

/**
 * These fields are omitted from the `*PkgManager*` events because they are
 * computed by the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
export type ComputedPkgManagerPackFields = 'totalPkgs' | 'totalPkgManagers';

/**
 * Pack-related events received by `SmokeMachine`
 *
 * @event
 */
export type SmokeMachinePackEvent =
  | SmokeMachinePkgManagerPackBeginEvent
  | SmokeMachinePkgManagerPackOkEvent
  | SmokeMachinePkgManagerPackFailedEvent
  | SmokeMachinePkgPackBeginEvent
  | SmokeMachinePkgPackFailedEvent
  | SmokeMachinePkgPackOkEvent;

/**
 * Received from `PkgManagerMachine` when packing begins.
 *
 * @event
 */
export type SmokeMachinePkgManagerPackBeginEvent = MachineEvent<
  'PACK.PKG_MANAGER_PACK_BEGIN',
  Omit<PackEvent.PkgManagerPackBeginEventData, ComputedPkgManagerPackFields>
>;

/**
 * Received from `PkgManagerMachine` when packing fails.
 *
 * **Note**: This should be considered a fatal error.
 *
 * @event
 */
export type SmokeMachinePkgManagerPackFailedEvent = MachineEvent<
  'PACK.PKG_MANAGER_PACK_FAILED',
  Omit<PackEvent.PkgManagerPackFailedEventData, ComputedPkgManagerPackFields>
>;

/**
 * Received from `PkgManagerMachine` when packing succeeds.
 *
 * @event
 */
export type SmokeMachinePkgManagerPackOkEvent = MachineEvent<
  'PACK.PKG_MANAGER_PACK_OK',
  Omit<PackEvent.PkgManagerPackOkEventData, ComputedPkgManagerPackFields>
>;

/**
 * Received from `PkgManagerMachine` when a discrete pack begins.
 *
 * @event
 */
export type SmokeMachinePkgPackBeginEvent = MachineEvent<
  'PACK.PKG_PACK_BEGIN',
  Omit<PackEvent.PkgPackBeginEventData, ComputedPkgEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a discrete pack fails.
 *
 * @event
 */
export type SmokeMachinePkgPackFailedEvent = MachineEvent<
  'PACK.PKG_PACK_FAILED',
  Omit<PackEvent.PkgPackFailedEventData, ComputedPkgEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a discrete pack succeeds.
 *
 * @event
 */
export type SmokeMachinePkgPackOkEvent = MachineEvent<
  'PACK.PKG_PACK_OK',
  Omit<PackEvent.PkgPackOkEventData, ComputedPkgEventFields>
>;
