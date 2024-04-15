import {type InstallManifest, type PkgManager} from '#pkg-manager';
import {type InstallMachineOutput} from './install-machine';

export interface InstallerMachineInstallEvent {
  type: 'INSTALL';
  pkgManager: PkgManager;
  installManifests: InstallManifest[];
}

export interface InstallerMachineInstallDoneEvent {
  type: 'xstate.done.actor.InstallMachine.*';
  output: InstallMachineOutput;
}

export interface InstallerMachinePackingCompleteEvent {
  type: 'PACKING_COMPLETE';
}

export type InstallerMachineEvents =
  | InstallerMachineInstallEvent
  | InstallerMachinePackingCompleteEvent
  | InstallerMachinePkgManagerInstallBeginEvent
  | InstallerMachineInstallDoneEvent;

export interface InstallerMachinePkgManagerInstallBeginEvent {
  type: 'PKG_MANAGER_INSTALL_BEGIN';
  index: number;
  pkgManager: PkgManager;
  installManifests: InstallManifest[];
}
