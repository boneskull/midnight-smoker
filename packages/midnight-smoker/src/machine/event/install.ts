/**
 * Install-related events received by `SmokeMachine`.
 *
 * These events are views into the public events as seen in {@link InstallEvent}.
 *
 * @remarks
 * `SmokeMachine` does not listen for each event individually; instead it
 * listens for `INSTALL.*` events
 * @packageDocumentation
 * @see {@link SmokeMachineInstallEvent}
 * @todo Might need a `PkgInstallEnd` event
 */
import type * as InstallEvent from '#event/install-events';
import {type MachineEvent} from '#machine/util';
import {type ComputedPkgEventFields} from './pkg';

/**
 * These fields are omitted from the `*PkgManager*` events because they are
 * computed by the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
type ComputedPkgManagerInstallFields = 'totalPkgs' | 'totalPkgManagers';

/**
 * Install-related events received by `SmokeMachine`
 *
 * @event
 */
export type SmokeMachineInstallEvent =
  | SmokeMachinePkgInstallBeginEvent
  | SmokeMachinePkgInstallOkEvent
  | SmokeMachinePkgInstallFailedEvent
  | SmokeMachinePkgManagerInstallBeginEvent
  | SmokeMachinePkgManagerInstallOkEvent
  | SmokeMachinePkgManagerInstallFailedEvent;

/**
 * Received from `PkgManagerMachine` when a package install begins.
 *
 * @event
 */
export type SmokeMachinePkgInstallBeginEvent = MachineEvent<
  'INSTALL.PKG_INSTALL_BEGIN',
  Omit<InstallEvent.PkgInstallBeginEventData, ComputedPkgEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a package install fails.
 *
 * @event
 */
export type SmokeMachinePkgInstallFailedEvent = MachineEvent<
  'INSTALL.PKG_INSTALL_FAILED',
  Omit<InstallEvent.PkgInstallFailedEventData, ComputedPkgEventFields>
>;

/**
 * Received from `PkgManagerMachine` when a package install succeeds.
 *
 * @event
 */
export type SmokeMachinePkgInstallOkEvent = MachineEvent<
  'INSTALL.PKG_INSTALL_OK',
  Omit<InstallEvent.PkgInstallOkEventData, ComputedPkgEventFields>
>;

/**
 * Received from `PkgManagerMachine` when it begins installations.
 *
 * @event
 */
export type SmokeMachinePkgManagerInstallBeginEvent = MachineEvent<
  'INSTALL.PKG_MANAGER_INSTALL_BEGIN',
  Omit<
    InstallEvent.PkgManagerInstallBeginEventData,
    ComputedPkgManagerInstallFields
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
  'INSTALL.PKG_MANAGER_INSTALL_FAILED',
  Omit<
    InstallEvent.PkgManagerInstallFailedEventData,
    ComputedPkgManagerInstallFields
  >
>;

/**
 * Received from `PkgManagerMachine` when all of its installations succeed.
 *
 * @event
 */
export type SmokeMachinePkgManagerInstallOkEvent = MachineEvent<
  'INSTALL.PKG_MANAGER_INSTALL_OK',
  Omit<
    InstallEvent.PkgManagerInstallOkEventData,
    ComputedPkgManagerInstallFields
  >
>;
