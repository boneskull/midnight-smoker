import type {ExecaReturnValue, ExecaError} from 'execa';
import type {SmokerError} from './error';
import type {PackageManager} from './pm';

export type RunScriptValue = Pick<
  ExecaReturnValue<string>,
  'stdout' | 'stderr' | 'command' | 'exitCode' | 'failed' | 'all'
>;

export interface RunScriptResult {
  pkgName: string;
  script: string;
  error?: SmokerError;
  rawResult: RunScriptValue | ExecaError;
  cwd: string;
  skipped?: boolean;
}

/**
 * Options for {@linkcode Smoker.pack}
 */
export interface PackOptions {
  npmPath: string;
  tmpDir: string;
  workspaces?: string[];
  allWorkspaces?: boolean;
  includeWorkspaceRoot?: boolean;
  silent?: boolean;
}

/**
 * An item in the array returned by {@linkcode Smoker.pack}
 */
export interface PackedPackage {
  pkgName: string;
  installPath: string;
  tarballFilepath: string;
}

export interface InstallManifest {
  packedPkgs: PackedPackage[];
  additionalDeps?: string[];
  tarballRootDir: string;
}

export interface SmokeOptions {
  /**
   * List of workspaces to use
   */
  workspace?: string[];
  /**
   * Use all workspaces
   */
  all?: boolean;
  /**
   * Include workspace root; implies `allWorkspaces`
   */
  includeRoot?: boolean;
  /**
   * Working directory to use. If omitted, a temp dir is created
   */
  dir?: string;
  /**
   * If `true`, working directory will be overwritten
   */
  force?: boolean;
  /**
   * If `true` truncate working directory. Implies `force`
   */
  clean?: boolean;
  /**
   * Explicit path to `npm`
   */
  npm?: string;
  /**
   * If `true`, show STDERR/STDOUT from the package manager
   */
  verbose?: boolean;
  /**
   * If `true`, leave temp dir intact after exit
   */
  linger?: boolean;
  /**
   * If `true`, halt at first failure
   */
  bail?: boolean;

  /**
   * If `true`, output JSON instead of human-readable text
   */
  json?: boolean;

  /**
   * Additional deps to install
   */
  add?: string[];

  pm?: string[];

  loose?: boolean;
}

export type SmokerOptions = Omit<SmokeOptions, 'verbose'>;

export interface InstallEventData {
  uniquePkgs: string[];
  packageManagers: string[];
  manifests: InstallManifest[];

  additionalDeps: string[];
}

export type PackOkEventData = InstallEventData;

export interface RunManifest {
  packedPkg: PackedPackage;
  script: string;
}

export interface RunScriptsEventData {
  manifest: Record<string, RunManifest[]>;
  total: number;
}

export type RunScriptsBeginEventData = RunScriptsEventData;

export interface RunScriptsEndEventData extends RunScriptsEventData {
  executed: number;
  results: RunScriptResult[];
  failures: number;
}

export type RunScriptsOkEventData = RunScriptsEndEventData;

export type RunScriptsFailedEventData = RunScriptsEndEventData;

export interface RunScriptEventData {
  script: string;
  pkgName: string;
  total: number;
  current: number;
}

export interface RunScriptFailedEventData extends RunScriptEventData {
  error: SmokerError;
}

export type PkgInstallManifest = Map<PackageManager, InstallManifest>;

export type PkgRunManifest = Map<PackageManager, Set<RunManifest>>;
