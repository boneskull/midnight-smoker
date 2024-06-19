import {type InstallEvents} from '#constants';
import {type InstallError} from '#error/install-error';
import type * as Schema from '#schema/meta/for-install-events';
import {type PkgManagerEventBase} from './common';

export interface InstallEventData {
  /**
   * Emitted when the installation of packages begins
   *
   * @event
   */
  [InstallEvents.InstallBegin]: InstallBeginEventData;

  /**
   * Emitted all packages were installed successfully across all package
   * managers
   *
   * @event
   */
  [InstallEvents.InstallOk]: InstallOkEventData;

  /**
   * Emitted if any package fails to install; emitted _after_
   * `PkgmanagerInstallFailed`.
   *
   * @event
   */
  [InstallEvents.InstallFailed]: InstallFailedEventData;

  /**
   * Emitted when a package manager begins installing packages
   *
   * @event
   */
  [InstallEvents.PkgManagerInstallBegin]: PkgManagerInstallBeginEventData;

  /**
   * Emitted when a package manager finishes installing packages successfully
   *
   * @event
   */
  [InstallEvents.PkgManagerInstallOk]: PkgManagerInstallOkEventData;

  /**
   * Emitted when a package manager fails to install packages
   *
   * @event
   */
  [InstallEvents.PkgManagerInstallFailed]: PkgManagerInstallFailedEventData;

  [InstallEvents.PkgInstallBegin]: PkgInstallBeginEventData;

  [InstallEvents.PkgInstallOk]: PkgInstallOkEventData;

  [InstallEvents.PkgInstallFailed]: PkgInstallFailedEventData;
}

export interface InstallBeginEventData extends InstallEventDataBase {}

export interface InstallEventDataBase {
  /**
   * A unique list of additional dependencies to install (if any), flatted from
   * {@link manifests}
   */
  additionalDeps: string[];

  /**
   * List of unique package managers
   */
  pkgManagers: Schema.StaticPkgManagerSpec[];

  /**
   * Total number of packages to install
   *
   * `pkgManagers.length * workspaceInfo.length`
   */
  totalPkgs: number;

  workspaceInfo: Schema.WorkspaceInfo[];
}

export interface InstallFailedEventData extends InstallEventDataBase {
  error: InstallError;
}

export interface InstallOkEventData extends InstallEventDataBase {}

export interface PkgInstallBeginEventData extends PkgInstallEventDataBase {}

export interface PkgInstallEventDataBase {
  installManifest: Schema.InstallManifest;
  pkgManager: Schema.StaticPkgManagerSpec;
  totalPkgs: number;
}

export interface PkgInstallFailedEventData extends PkgInstallEventDataBase {
  error: InstallError;
}

export interface PkgInstallOkEventData extends PkgInstallEventDataBase {
  rawResult: Schema.ExecResult;
}

export interface PkgManagerInstallBeginEventData
  extends PkgManagerInstallEventDataBase {}

export interface PkgManagerInstallEventDataBase extends PkgManagerEventBase {
  manifests: Schema.InstallManifest[];
  totalPkgs: number;
}

export interface PkgManagerInstallFailedEventData
  extends PkgManagerInstallEventDataBase {
  error: InstallError;
}

export interface PkgManagerInstallOkEventData
  extends PkgManagerInstallEventDataBase {}
