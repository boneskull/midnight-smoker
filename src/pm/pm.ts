import type {SemVer} from 'semver';
import type {InstallManifest, RunManifest, RunScriptResult} from '../types';
import type {CorepackExecutor} from './corepack';

export interface InstallOpts {}

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

export interface PackOpts {
  /**
   * Pack _all_ workspaces
   */
  allWorkspaces?: boolean;
  /**
   * Include the workspace root when packing
   */
  includeWorkspaceRoot?: boolean;

  /**
   * List of individual workspaces
   */
  workspaces?: string[];
}

export interface RunScriptOpts {}

/**
 * @todo make this more useful
 */
export interface InstallResult {
  stdout: string;
  stderr: string;
  command: string;
  exitCode: number;
}

export interface PackageManager {
  /**
   * Installs packages from tarballs as specified in the manifest
   * @param manifest Installation manifest
   * @param opts Options
   * @returns Result of installation
   */
  install(
    manifest: InstallManifest,
    opts?: InstallOpts,
  ): Promise<InstallResult>;

  /**
   * @param dest Destination directory where tarballs will go
   * @param opts Options
   * @returns Manifest for {@linkcode install}
   */
  pack(dest: string, opts?: PackOpts): Promise<InstallManifest>;

  /**
   *
   * @param manifest Object containing script and package information
   * @param script Script to run
   * @param opts Options
   * @returns Result of running the script
   */
  runScript(
    manifest: RunManifest,
    opts?: RunScriptOpts,
  ): Promise<RunScriptResult>;
}

/**
 * A function which returns an object implementing {@linkcode PackageManager}.
 */
export type PackageManagerFactory = (
  executor: CorepackExecutor,
  opts?: PackageManagerOpts,
) => PackageManager | Promise<PackageManager>;

export interface PackageManagerModule {
  bin: string;
  /**
   * Returns `true` if this `PackageManager` can handle the given version
   * @param semver
   */
  accepts(semver: SemVer): boolean;
  load: PackageManagerFactory;
}
