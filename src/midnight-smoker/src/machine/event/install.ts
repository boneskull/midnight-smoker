/**
 * Install-related events received by `SmokeMachine`.
 *
 * These events are views into the public events as seen in
 * {@link InstallEventData}.
 *
 * @remarks
 * `SmokeMachine` does not listen for each event individually; instead it
 * listens for `INSTALL.*` events
 * @packageDocumentation
 * @see {@link SmokeMachineInstallEvent}
 * @todo Might need a `PkgInstallEnd` event
 */
import {
  type InstallEvents,
  type PkgInstallBeginEventData,
  type PkgInstallFailedEventData,
  type PkgInstallOkEventData,
  type PkgManagerInstallBeginEventData,
  type PkgManagerInstallFailedEventData,
  type PkgManagerInstallOkEventData,
} from '#event/install-events';
import {type Except} from 'type-fest';

import {
  type ComputedPkgEventFields,
  type ComputedPkgManagerEventFields,
  type MachineEvent,
} from './common.js';

/**
 * Install-related events received by `SmokeMachine`
 *
 * @event
 */
export type SmokeMachineInstallEvent =
  | SmokeMachinePkgInstallBeginEvent
  | SmokeMachinePkgInstallFailedEvent
  | SmokeMachinePkgInstallOkEvent
  | SmokeMachinePkgManagerInstallBeginEvent
  | SmokeMachinePkgManagerInstallFailedEvent
  | SmokeMachinePkgManagerInstallOkEvent;

/**
 * Received from `PkgManagerMachine` when a package install begins.
 *
 * @event
 */
export type SmokeMachinePkgInstallBeginEvent = MachineEvent<
  typeof InstallEvents.PkgInstallBegin,
  Except<
    PkgInstallBeginEventData,
    ComputedPkgEventFields,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when a package install fails.
 *
 * @event
 */
export type SmokeMachinePkgInstallFailedEvent = MachineEvent<
  typeof InstallEvents.PkgInstallFailed,
  Except<
    PkgInstallFailedEventData,
    ComputedPkgEventFields,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when a package install succeeds.
 *
 * @event
 */
export type SmokeMachinePkgInstallOkEvent = MachineEvent<
  typeof InstallEvents.PkgInstallOk,
  Except<
    PkgInstallOkEventData,
    ComputedPkgEventFields,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when it begins installations.
 *
 * @event
 */
export type SmokeMachinePkgManagerInstallBeginEvent = MachineEvent<
  typeof InstallEvents.PkgManagerInstallBegin,
  Except<
    PkgManagerInstallBeginEventData,
    ComputedPkgManagerEventFields,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when any of its installations fail.
 *
 * **Note**: This should be considered a fatal error.
 *
 * @event
 */
export type SmokeMachinePkgManagerInstallFailedEvent = MachineEvent<
  typeof InstallEvents.PkgManagerInstallFailed,
  Except<
    PkgManagerInstallFailedEventData,
    ComputedPkgManagerEventFields,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when all of its installations succeed.
 *
 * @event
 */
export type SmokeMachinePkgManagerInstallOkEvent = MachineEvent<
  typeof InstallEvents.PkgManagerInstallOk,
  Except<
    PkgManagerInstallOkEventData,
    ComputedPkgManagerEventFields,
    {requireExactProps: true}
  >
>;
