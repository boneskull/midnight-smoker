import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type InstallError, type PkgManager} from '#pkg-manager';
import {type InstallManifest, type InstallResult} from '#schema';
import {type AnyActorRef} from 'xstate';

export interface InstallMachineInput {
  pkgManager: PkgManager;
  installManifests: InstallManifest[];
  signal: AbortSignal;
  index: number;
  parentRef: AnyActorRef;
}

export interface InstallMachineContext extends InstallMachineInput {
  error?: InstallError;

  installManifestQueue: InstallManifest[];
  currentManifest?: InstallManifest;
}

export type InstallMachineOk = ActorOutputOk<
  Pick<InstallMachineContext, 'pkgManager' | 'index' | 'installManifests'>
>;

export type InstallMachineError = ActorOutputError<
  InstallError,
  Pick<InstallMachineContext, 'pkgManager' | 'index' | 'installManifests'>
>;

export type InstallActorParams = Pick<
  InstallMachineContext,
  'pkgManager' | 'signal'
> & {installManifest: InstallManifest};

export type InstallActorOk = ActorOutputOk<InstallResult>;

export type InstallActorError = ActorOutputError<
  InstallError,
  {installManifest: InstallManifest}
>;

export type InstallActorOutput = InstallActorOk | InstallActorError;

export type InstallMachineOutput = InstallMachineOk | InstallMachineError;
