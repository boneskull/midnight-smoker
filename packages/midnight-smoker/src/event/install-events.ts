import type {
  ExecResult,
  InstallError,
  InstallManifest,
  StaticPkgManagerSpec,
} from '../component';
import type {InstallEvent} from './event-constants';
import type {PkgManagerEventBase} from './pkg-manager-events';

export interface InstallEventData {
  /**
   * Emitted when the installation of packages begins
   *
   * @event
   */
  [InstallEvent.InstallBegin]: InstallBeginEventData;

  /**
   * Emitted all packages were installed successfully across all package
   * managers
   *
   * @event
   */
  [InstallEvent.InstallOk]: InstallOkEventData;

  /**
   * Emitted if any package fails to install; emitted _after_
   * `PkgmanagerInstallFailed`.
   *
   * @event
   */
  [InstallEvent.InstallFailed]: InstallFailedEventData;

  /**
   * Emitted when a package manager begins installing packages
   *
   * @event
   */
  [InstallEvent.PkgManagerInstallBegin]: PkgManagerInstallBeginEventData;

  /**
   * Emitted when a package manager finishes installing packages successfully
   *
   * @event
   */
  [InstallEvent.PkgManagerInstallOk]: PkgManagerInstallOkEventData;

  /**
   * Emitted when a package manager fails to install packages
   *
   * @event
   */
  [InstallEvent.PkgManagerInstallFailed]: PkgManagerInstallFailedEventData;

  [InstallEvent.PkgInstallBegin]: PkgInstallBeginEventData;

  [InstallEvent.PkgInstallOk]: PkgInstallOkEventData;

  [InstallEvent.PkgInstallFailed]: PkgInstallFailedEventData;
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
  pkgManagers: StaticPkgManagerSpec[];

  /**
   * Total number of packages to install
   *
   * `pkgManagers.length * totalPkgs`
   */
  totalPkgs: number;

  /**
   * List of unique package names which either will be or have been installed
   * (depending on context).
   */
  uniquePkgs: string[];
}

export interface InstallFailedEventData extends InstallEventDataBase {
  error: InstallError;
}

export interface InstallOkEventData extends InstallEventDataBase {}

export interface PkgInstallBeginEventData extends PkgInstallEventDataBase {}

export interface PkgInstallEventDataBase {
  installManifest: InstallManifest;
  pkgManager: StaticPkgManagerSpec;
  totalPkgs: number;
}

export interface PkgInstallFailedEventData extends PkgInstallEventDataBase {
  error: InstallError;
}

export interface PkgInstallOkEventData extends PkgInstallEventDataBase {
  rawResult: ExecResult;
}

export interface PkgManagerInstallBeginEventData
  extends PkgManagerInstallEventDataBase {}

export interface PkgManagerInstallEventDataBase extends PkgManagerEventBase {
  manifests: InstallManifest[];
  pkgManager: StaticPkgManagerSpec;
  totalPkgs: number;
}

export interface PkgManagerInstallFailedEventData
  extends PkgManagerInstallEventDataBase {
  error: InstallError;
}

export interface PkgManagerInstallOkEventData
  extends PkgManagerInstallEventDataBase {}
