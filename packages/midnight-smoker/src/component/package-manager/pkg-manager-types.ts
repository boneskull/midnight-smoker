/**
 * Types for a {@link PkgManager} component as defined within a plugin.
 *
 * @packageDocumentation
 */

import {type Range, type SemVer} from 'semver';
import type * as Helpers from '../../plugin/helpers';
import {type Executor} from '../executor/executor';
import {type PkgManager} from './pkg-manager-schema';
import {type PkgManagerSpec} from './pkg-manager-spec';

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
export type PkgManagerFactory = (
  spec: PkgManagerSpec,
  executor: Executor,
  helpers: typeof Helpers,
  opts?: PkgManagerOpts,
) => Promise<PkgManager>;

/**
 * Returns `true` if this `PackageManager` can handle the given version.
 *
 * @param semver The version to check.
 * @returns `true` if the package manager can handle the version, `false`
 *   otherwise.
 */
export type PkgManagerAcceptsFn = (semver: SemVer) => boolean;

export type PkgManagerAcceptsRange = string | Range;

export interface PkgManagerDef {
  /**
   * The name of the package manager's executable.
   */
  bin: string;

  /**
   * Either a SemVer range or a function which returns `true` if its parameter
   * is within the allowed range.
   */
  accepts: PkgManagerAcceptsFn | PkgManagerAcceptsRange;

  lockfile?: string;

  /**
   * Creates a {@link PkgManager} object.
   */
  create: PkgManagerFactory;
}

export type {PkgManager};
