import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {
  type PackError,
  type PackParseError,
  type PkgManager,
} from '#pkg-manager';
import {type InstallManifest, type WorkspaceInfo} from '#schema';
import {type ActorRefFrom, type AnyActorRef} from 'xstate';
import {type PackActorOutput, type pack} from './pack-machine-actors';

export interface PackMachineInput {
  signal: AbortSignal;
  pkgManager: PkgManager;
  // opts: PackOptions;
  workspaceInfo: WorkspaceInfo[];
  parentRef: AnyActorRef;
  index: number;
}

export interface PackMachineContext extends PackMachineInput {
  installManifests?: InstallManifest[];
  error?: PackError | PackParseError;
  packActorRefs?: Record<string, ActorRefFrom<typeof pack>>;
}

export type PackMachineEvents = {
  type: 'xstate.done.actor.PackActor.*';
  output: PackActorOutput;
};

export type PackMachineOutputOk = ActorOutputOk<
  PkgManagerPackResult & {index: number}
>;

export type PackMachineOutputError = ActorOutputError<
  PackError | PackParseError,
  Omit<PkgManagerPackResult, 'installManifests'> & {index: number}
>;

export type PackMachineOutput = PackMachineOutputOk | PackMachineOutputError;

export interface PkgManagerPackResult {
  installManifests: InstallManifest[];
  pkgManager: PkgManager;
  workspaceInfo: WorkspaceInfo[];
}
