import type {ExecaError, ExecaReturnValue} from 'execa';
import type {ScriptError} from './error';
import type {PackageManager} from './pm';
import type {RawRuleConfig, CheckResults} from './rules';

/**
 * Properties of the result of running `execa` that we care about
 */
export type RawRunScriptProps =
  | 'stdout'
  | 'stderr'
  | 'command'
  | 'exitCode'
  | 'failed'
  | 'all';

export type RawRunScriptResult = Pick<
  ExecaReturnValue<string>,
  RawRunScriptProps
>;

export type RawRunScriptError = Pick<ExecaError, RawRunScriptProps>;

export interface RunScriptResult {
  pkgName: string;
  script: string;
  error?: ScriptError;
  rawResult: RawRunScriptResult | RawRunScriptError;
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

export interface RunManifest {
  packedPkg: PackedPackage;
  script: string;
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

  /**
   * Package manager ids
   */
  pm?: string[];

  /**
   * If `true`, ignore missing scripts (if `all` is `true`)
   */
  loose?: boolean;

  /**
   * Raw (user-provided) rule configuration
   */
  rules?: RawRuleConfig;

  /**
   * If `true`, run checks
   * @defaultValue true
   */
  checks?: boolean;
}

export type SmokerOptions = Omit<SmokeOptions, 'verbose'>;

/**
 * Describes what tarballs to install where with what package manager
 */
export type PkgInstallManifest = Map<PackageManager, InstallManifest>;

/**
 * Describes what scripts to run where with what package manager
 */
export type PkgRunManifest = Map<PackageManager, Set<RunManifest>>;

/**
 * The result of running `Smoker.prototype.smoke()`
 */
export interface SmokeResults {
  opts: SmokeOptions;
  scripts: RunScriptResult[];
  checks: CheckResults;
}

/**
 * Stats gathered during the run
 */
export interface SmokerStats {
  totalPackages: number | null;
  totalPackageManagers: number | null;
  totalScripts: number | null;
  failedScripts: number | null;
  passedScripts: number | null;
  totalChecks: number | null;
  failedChecks: number | null;
  passedChecks: number | null;
}

export interface SmokerJsonResults {
  results: SmokeResults;
  stats: SmokerStats;
}

export interface SmokerJsonError {
  error: string;
  stats: SmokerStats;
}

export type SmokerJsonOutput = SmokerJsonResults | SmokerJsonError;
