import {
  type InstallManifest,
  type PackError,
  type PackParseError,
  type PkgManager,
} from '#pkg-manager';
import {type PackMachineOutput} from './pack-machine-types';

export interface PackerMachinePackEvent {
  type: 'PACK';
  pkgManager: PkgManager;
}

export interface PackerMachinePkgManagerPackBeginEvent {
  type: 'PKG_MANAGER_PACK_BEGIN';
  pkgManager: PkgManager;
  index: number;
}

export interface PackerMachinePkgPackBeginEvent {
  type: 'PKG_PACK_BEGIN';
  localPath: string;
  currentPkg: number;
  pkgManager: PkgManager;
}

export interface PackerMachinePkgPackOkEvent {
  type: 'PKG_PACK_OK';
  installManifest: InstallManifest;
  currentPkg: number;
  pkgManager: PkgManager;
}

export interface PackerMachinePkgPackFailedEvent {
  type: 'PKG_PACK_FAILED';
  localPath: string;
  currentPkg: number;
  pkgManager: PkgManager;
  error: PackError | PackParseError;
}

export interface PackerMachinePackMachineDoneEvent {
  type: 'xstate.done.actor.PackMachine.*';
  output: PackMachineOutput;
}

export type PackerMachineEvents =
  | PackerMachinePackEvent
  | PackerMachinePkgManagerPackBeginEvent
  | PackerMachinePackMachineDoneEvent
  | PackerMachinePkgPackBeginEvent
  | PackerMachinePkgPackOkEvent
  | PackerMachinePkgPackFailedEvent;
