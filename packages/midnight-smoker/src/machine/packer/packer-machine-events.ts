import {type PkgManager} from '#pkg-manager';
import {type PackMachineOutput} from './pack-machine';

export interface PackerMachinePackEvent {
  type: 'PACK';
  pkgManager: PkgManager;
}

export interface PackerMachinePkgManagerPackBeginEvent {
  type: 'PKG_MANAGER_PACK_BEGIN';
  pkgManager: PkgManager;
  index: number;
}

export interface PackerMachinePackMachineDoneEvent {
  type: 'xstate.done.actor.PackMachine.*';
  output: PackMachineOutput;
}

export type PackerMachineEvents =
  | PackerMachinePackEvent
  | PackerMachinePkgManagerPackBeginEvent
  | PackerMachinePackMachineDoneEvent;
