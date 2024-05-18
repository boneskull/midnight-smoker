import {type PackError, type PackParseError} from '#error';
import type {
  InstallManifest,
  PackOptions,
  StaticPkgManagerSpec,
  WorkspaceInfo,
} from '#schema';
import type {PackEvent} from './event-constants';
import type {PkgManagerEventBase} from './pkg-manager-events';

export interface PackEventData {
  /**
   * Emitted whenever a package is about to be packed into a tarball.
   *
   * @event
   */
  [PackEvent.PackBegin]: PackBeginEventData;

  /**
   * Emitted whenever a package is packed successfully into a tarball.
   *
   * @event
   */
  [PackEvent.PackOk]: PackOkEventData;

  /**
   * Emitted whenever packing a tarball fails.
   *
   * This is considered unrecoverable, and `midnight-smoker` will exit with a
   * non-zero code soon thereafter.
   *
   * @event
   */
  [PackEvent.PackFailed]: PackFailedEventData;

  [PackEvent.PkgManagerPackBegin]: PkgManagerPackBeginEventData;

  [PackEvent.PkgManagerPackFailed]: PkgManagerPackFailedEventData;

  [PackEvent.PkgManagerPackOk]: PkgManagerPackOkEventData;

  [PackEvent.PkgPackBegin]: PkgPackBeginEventData;

  [PackEvent.PkgPackFailed]: PkgPackFailedEventData;

  [PackEvent.PkgPackOk]: PkgPackOkEventData;
}

export interface PkgPackEventDataBase {
  workspace: WorkspaceInfo;
  pkgManager: StaticPkgManagerSpec;
  totalPkgs: number;
}

export interface PkgPackBeginEventData extends PkgPackEventDataBase {}

export interface PkgPackOkEventData extends PkgPackEventDataBase {
  installManifest: InstallManifest;
}

export interface PkgPackFailedEventData extends PkgPackEventDataBase {
  error: PackError | PackParseError;
}

export interface PkgManagerPackEventDataBase extends PkgManagerEventBase {
  workspaceInfo: WorkspaceInfo[];
  packOptions?: PackOptions;
}

export interface PkgManagerPackBeginEventData
  extends PkgManagerPackEventDataBase {}

export interface PkgManagerPackFailedEventData
  extends PkgManagerPackEventDataBase {
  error: PackError | PackParseError;
}

export interface PkgManagerPackOkEventData extends PkgManagerPackEventDataBase {
  manifests: InstallManifest[];
}

export interface PackEventDataBase {
  pkgManagers: StaticPkgManagerSpec[];
  workspaceInfo: WorkspaceInfo[];
  packOptions?: PackOptions;
  uniquePkgs: string[];
  totalPkgs: number;
}

export interface PackBeginEventData extends PackEventDataBase {}

export interface PackOkEventData extends PackEventDataBase {}

export interface PackFailedEventData extends PackEventDataBase {
  error: PackError | PackParseError;
}
