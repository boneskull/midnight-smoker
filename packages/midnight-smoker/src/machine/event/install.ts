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
 * @see {@link AnyInstallMachineEvent}
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
  type ComputedPkgEventField,
  type ComputedPkgManagerEventField,
  type MachineEvent,
} from './common';

/**
 * Any package-specific install machine event
 *
 * @event
 */
export type AnyPkgInstallMachineEvent =
  | PkgInstallBeginMachineEvent
  | PkgInstallFailedMachineEvent
  | PkgInstallOkMachineEvent;

/**
 * Any `PkgManager`-specific machine event
 *
 * @event
 */
export type AnyPkgManagerInstallMachineEvent =
  | PkgManagerInstallBeginMachineEvent
  | PkgManagerInstallFailedMachineEvent
  | PkgManagerInstallOkMachineEvent;

/**
 * Install-related events received by `SmokeMachine`
 *
 * @event
 */
export type AnyInstallMachineEvent =
  | AnyPkgInstallMachineEvent
  | AnyPkgManagerInstallMachineEvent;

/**
 * Received from `PkgManagerMachine` when a package install begins.
 *
 * @event
 */
export type PkgInstallBeginMachineEvent = MachineEvent<
  typeof InstallEvents.PkgInstallBegin,
  Except<
    PkgInstallBeginEventData,
    ComputedPkgEventField,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when a package install fails.
 *
 * @event
 */
export type PkgInstallFailedMachineEvent = MachineEvent<
  typeof InstallEvents.PkgInstallFailed,
  Except<
    PkgInstallFailedEventData,
    ComputedPkgEventField,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when a package install succeeds.
 *
 * @event
 */
export type PkgInstallOkMachineEvent = MachineEvent<
  typeof InstallEvents.PkgInstallOk,
  Except<
    PkgInstallOkEventData,
    ComputedPkgEventField,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when it begins installations.
 *
 * @event
 */
export type PkgManagerInstallBeginMachineEvent = MachineEvent<
  typeof InstallEvents.PkgManagerInstallBegin,
  Except<
    PkgManagerInstallBeginEventData,
    ComputedPkgManagerEventField,
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
export type PkgManagerInstallFailedMachineEvent = MachineEvent<
  typeof InstallEvents.PkgManagerInstallFailed,
  Except<
    PkgManagerInstallFailedEventData,
    ComputedPkgManagerEventField,
    {requireExactProps: true}
  >
>;

/**
 * Received from `PkgManagerMachine` when all of its installations succeed.
 *
 * @event
 */
export type PkgManagerInstallOkMachineEvent = MachineEvent<
  typeof InstallEvents.PkgManagerInstallOk,
  Except<
    PkgManagerInstallOkEventData,
    ComputedPkgManagerEventField,
    {requireExactProps: true}
  >
>;
