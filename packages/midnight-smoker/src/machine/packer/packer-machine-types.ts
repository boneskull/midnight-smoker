import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {
  type PackError,
  type PackOptions,
  type PackParseError,
  type PkgManager,
} from '#pkg-manager';
import {type InstallManifest, type WorkspaceInfo} from '#schema';
import {type ActorRefFrom, type AnyActorRef} from 'xstate';
import {type PackMachine} from './pack-machine';

export interface PackerMachineInput {
  signal: AbortSignal;
  opts: PackOptions;
  parentRef: AnyActorRef;
  pkgManagers: PkgManager[];
  workspaceInfo: WorkspaceInfo[];
}

export interface PackerMachineContext extends PackerMachineInput {
  packMachineRefs: Record<string, ActorRefFrom<typeof PackMachine>>;
  error?: PackError | PackParseError;
  manifests: InstallManifest[];
}

export type PackerMachineOutputError = ActorOutputError<
  PackError | PackParseError
>;

export type PackerMachineOutputOk = ActorOutputOk<{
  manifests: InstallManifest[];
}>;

export type PackerMachineOutput =
  | PackerMachineOutputOk
  | PackerMachineOutputError;
