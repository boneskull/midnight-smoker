import type {ExecaError, ExecaReturnValue} from 'execa';
import type {SmokerError} from './error';

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
   * Extra arguments to pass to `npm install`
   */
  installArgs?: string[];
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
}

export type SmokerOptions = Omit<SmokeOptions, 'verbose'>;

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
}

export interface Events {
  SmokeBegin: void;
  SmokeOk: void;
  SmokeFailed: (err: Error) => void;
  PackBegin: void;
  PackFailed: SmokerError;
  PackOk: InstallManifest;
  InstallBegin: InstallManifest;
  InstallFailed: SmokerError;
  InstallOk: InstallManifest;
  RunScriptsBegin: {
    scripts: string[];
    packedPkgs: PackedPackage[];
    total: number;
  };
  RunScriptsFailed: {
    total: number;
    executed: number;
    failures: number;
    results: RunScriptResult[];
    scripts: string[];
  };
  RunScriptsOk: {
    total: number;
    executed: number;
    results: RunScriptResult[];
    scripts: string[];
  };
  RunScriptBegin: {
    script: string;
    pkgName: string;
    total: number;
    current: number;
  };
  RunScriptFailed: RunScriptResult & {
    error: SmokerError;
    total: number;
    current: number;
  };
  RunScriptOk: RunScriptResult & {
    total: number;
    current: number;
  };

  Lingered: string[];
}
