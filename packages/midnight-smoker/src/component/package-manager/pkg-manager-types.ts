/**
 * Types for a {@link PkgManager} component as defined within a plugin.
 *
 * @packageDocumentation
 */

import {type Range, type SemVer} from 'semver';
import {type PkgManager} from './pkg-manager-schema';

/**
 * Options for {@link PkgManagerFactory}
 */
export interface PkgManagerOpts {
  /**
   * If `true`, show STDERR/STDOUT from the package manager
   */
  verbose?: boolean;

  /**
   * If `true`, ignore missing scripts
   */
  loose?: boolean;
}

/**
 * A function which returns an object implementing {@link PkgManager}.
 */
export type {PkgManagerFactory} from './pkg-manager-schema';

/**
 * Returns `true` if this `PackageManager` can handle the given version.
 *
 * @param semver The version to check.
 * @returns `true` if the package manager can handle the version, `false`
 *   otherwise.
 */
export type PkgManagerAcceptsFn = (semver: SemVer) => boolean;

export type PkgManagerAcceptsRange = string | Range;

export type {PkgManagerDef} from './pkg-manager-schema';

export type {PkgManager};
