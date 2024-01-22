import type {InstallError} from '../component/pkg-manager/errors/install-error';
import type {InstallManifest} from '../component/pkg-manager/pkg-manager-schema';

export interface InstallEvents {
  /**
   * Emitted whenever a package is about to be installed (from a tarball) into
   * its temp directory.
   *
   * Should happen once per package.
   *
   * @event
   */
  InstallBegin: InstallEventData;

  /**
   * Emitted when a package fails to install.
   *
   * This is considered unrecoverable, and `midnight-smoker` will exit with a
   * non-zero code soon thereafter.
   *
   * @event
   */
  InstallFailed: InstallError;

  /**
   * Emitted when a package is installed successfully from a tarball.
   *
   * @event
   */
  InstallOk: InstallOkEventData;
} /**
 * Data emitted by various {@link SmokerEvent events}.
 *
 * @see {@link SmokerEvents}
 */

export interface InstallEventData {
  /**
   * List of unique package names which either will be or have been installed
   * (depending on context).
   */
  uniquePkgs: string[];
  /**
   * List of unique package manager specifiers, each of which corresponding to a
   * package manager which will (or did) execute the current operation.
   */
  pkgManagerSpecs: string[];

  /**
   * List of unique package managers, corresponding to specifiers
   */
  pkgManagers: [name: string, version: string][];

  /**
   * A list of objects describing what packages to install where, and what
   * additional deps to install (if any).
   */
  manifests: InstallManifest[];

  /**
   * A unique list of additional dependencies to install (if any), flatted from
   * {@link manifests}
   */
  additionalDeps: string[];

  /**
   * Total number of packages to install
   */
  total: number;
}

export interface InstallOkEventData extends InstallEventData {
  current: number;
}
