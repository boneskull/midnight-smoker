import type {InstallManifest, PackedPackage, RunScriptResult} from '../types';

export interface InstallOpts {
  extraArgs?: string[];
}

export interface PackageManagerOpts {
  /**
   * If `true`, show STDERR/STDOUT from the package manager
   */
  verbose?: boolean;
  /**
   * Explicit path to package manager executable
   */
  binPath?: string;
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

  extraArgs?: string[];
}

export interface RunScriptOpts {
  bail?: boolean;
}

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
   * Package manager name; should be the same as the executable name
   */
  name: string;

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
   * @param packedPkg Object containing package name and installation directory
   * @param script Script to run
   * @param opts Options
   * @returns Result of running the script
   */
  runScript(
    packedPkg: PackedPackage,
    script: string,
    opts?: RunScriptOpts,
  ): Promise<RunScriptResult>;
}

/**
 * A function which returns an object implementing {@linkcode PackageManager}.
 *
 * **This must be the default export of any package manager module.**
 */
export type PackageManagerFactory = (
  opts?: PackageManagerOpts,
) => PackageManager | Promise<PackageManager>;
