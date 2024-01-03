/**
 * Types for a {@link PackageManager} component as defined within a plugin.
 *
 * @packageDocumentation
 */

import type {SemVer} from 'semver';
import type * as Helpers from '../../plugin/helpers';
import type {Executor} from '../executor';
import type {PackageManager} from '../schema/pkg-manager-schema';
export {ExecutorOpts as ExecOpts, ExecResult} from '../executor';
export type {
  InstallManifest,
  PackOptions,
  PkgManagerRunScriptOpts,
  RunScriptManifest,
  RunScriptResult,
} from '../schema/pkg-manager-schema';
export {Executor};

/**
 * Options for {@link PackageManagerFactory}
 */
export interface PackageManagerOpts {
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
 * A function which returns an object implementing {@linkcode PackageManager}.
 */
export type PackageManagerFactory = (
  id: string,
  executor: Executor,
  helpers: typeof Helpers,
  opts?: PackageManagerOpts,
) => Promise<PackageManager>;

/**
 * Represents a module which exports a {@link PackageManager} component.
 */
export interface PackageManagerModule {
  /**
   * The name of the package manager's executable.
   */
  bin: string;
  /**
   * Returns `true` if this `PackageManager` can handle the given version.
   *
   * @param semver The version to check.
   * @returns `true` if the package manager can handle the version, `false`
   *   otherwise.
   */
  accepts(semver: SemVer): boolean;

  /**
   * Creates a {@link PackageManager} object.
   */
  create: PackageManagerFactory;
}

export {PackageManager};
