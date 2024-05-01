import {
  type InstallError,
  type InstallManifest,
  type PkgManager,
} from '#pkg-manager';
import {type ExecResult, type WorkspaceInfo} from '#schema';
import {type InstallMachineOutput} from './install-machine-types';

export interface InstallerMachineInstallEvent {
  type: 'INSTALL';
  workspaceInfo: WorkspaceInfo[];
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
  | InstallerMachinePkgInstallBeginEvent
  | InstallerMachinePkgInstallOkEvent
  | InstallerMachinePkgInstallFailedEvent
  | InstallerMachineInstallDoneEvent;

export interface InstallerMachinePkgInstallBaseEvent {
  currentPkg: number;
  pkgManager: PkgManager;
  installManifest: InstallManifest;
}

export interface InstallerMachinePkgInstallBeginEvent
  extends InstallerMachinePkgInstallBaseEvent {
  type: 'PKG_INSTALL_BEGIN';
}

export interface InstallerMachinePkgInstallOkEvent
  extends InstallerMachinePkgInstallBaseEvent {
  type: 'PKG_INSTALL_OK';
  rawResult: ExecResult;
}

export interface InstallerMachinePkgInstallFailedEvent
  extends InstallerMachinePkgInstallBaseEvent {
  type: 'PKG_INSTALL_FAILED';
  error: InstallError;
}

export interface InstallerMachinePkgManagerInstallBeginEvent {
  type: 'PKG_MANAGER_INSTALL_BEGIN';
  index: number;
  pkgManager: PkgManager;
  installManifests: InstallManifest[];
}
