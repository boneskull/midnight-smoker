import type * as Schema from '#schema/meta/for-install-events';

import {InstallEvents} from '#constants';
import {type InstallError} from '#error/install-error';

import {type PkgEventBase, type PkgManagerEventBase} from './common';

export {InstallEvents};

export type InstallBeginEventData = InstallEventDataBase;

export type InstallEventData = {
  /**
   * Emitted when the installation of packages begins
   *
   * @event
   */
  [InstallEvents.InstallBegin]: InstallBeginEventData;

  /**
   * Emitted if any package fails to install; emitted _after_
   * `PkgmanagerInstallFailed`.
   *
   * @event
   */
  [InstallEvents.InstallFailed]: InstallFailedEventData;

  /**
   * Emitted all packages were installed successfully across all package
   * managers
   *
   * @event
   */
  [InstallEvents.InstallOk]: InstallOkEventData;

  [InstallEvents.PkgInstallBegin]: PkgInstallBeginEventData;

  [InstallEvents.PkgInstallFailed]: PkgInstallFailedEventData;

  [InstallEvents.PkgInstallOk]: PkgInstallOkEventData;

  /**
   * Emitted when a package manager begins installing packages
   *
   * @event
   */
  [InstallEvents.PkgManagerInstallBegin]: PkgManagerInstallBeginEventData;

  /**
   * Emitted when a package manager fails to install packages
   *
   * @event
   */
  [InstallEvents.PkgManagerInstallFailed]: PkgManagerInstallFailedEventData;

  /**
   * Emitted when a package manager finishes installing packages successfully
   *
   * @event
   */
  [InstallEvents.PkgManagerInstallOk]: PkgManagerInstallOkEventData;
};

export type InstallFailedEventData = {
  error: InstallError;
} & InstallEventDataBase;

export type InstallOkEventData = InstallEventDataBase;

export type PkgInstallBeginEventData = PkgInstallEventDataBase;

export type PkgInstallEventDataBase = {
  installManifest: Schema.InstallManifest;
} & PkgEventBase;

export type PkgInstallFailedEventData = {
  error: InstallError;
} & PkgInstallEventDataBase;

export type PkgInstallOkEventData = {
  rawResult: Schema.ExecOutput;
} & PkgInstallEventDataBase;

export type PkgManagerInstallBeginEventData = {
  manifests: Schema.InstallManifest[];
} & PkgManagerInstallEventDataBase;

export type PkgManagerInstallEventDataBase = {
  totalPkgs: number;
} & PkgManagerEventBase;

export type PkgManagerInstallFailedEventData = {
  error: InstallError;
} & PkgManagerInstallEventDataBase;

export type PkgManagerInstallOkEventData = {
  manifests: Schema.InstallManifest[];
} & PkgManagerInstallEventDataBase;

export type InstallEventDataBase = {
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
};
