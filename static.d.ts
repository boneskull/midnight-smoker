import {ExecaError, ExecaReturnValue, Options} from 'execa';
import {StrictEventEmitter} from 'strict-event-emitter-types';
import {EventEmitter} from 'events';

/**
 * JSON output of `npm pack`
 */
export interface NpmPackItem {
  id: string;
  name: string;
  version: string;
  size: number;
  unpackedSize: number;
  shasum: string;
  integrity: string;
  filename: string;
  files: NpmPackItemFileEntry[];
  entryCount: number;
  bundled: any[];
}

/**
 * Type of item in the {@linkcode NpmPackItem.files} array.
 */
export interface NpmPackItemFileEntry {
  path: string;
  size: number;
  mode: number;
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
export interface PackItem {
  installPath: string;
  tarballFilepath: string;
}

export interface SmokerOptions {
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
   * If `true`, show output from `npm`
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
}

export interface RunScriptResult extends ExecaReturnValue<string> {
  pkgName: string;
  script: string;
}

export interface Events {
  SmokeBegin: void;
  SmokeOk: void;
  SmokeFailed: (err: Error) => void;
  FindNpmBegin: void;
  FindNpmOk: string;
  FindNpmFailed: (err: Error) => void;

  PackBegin: void;
  PackFailed: SyntaxError | ExecaError | Error;
  PackOk: PackItem[];
  RunNpmBegin: {command: string; options: Options};
  RunNpmFailed: ExecaError;
  RunNpmOk: {
    command: string;
    options: Options;
    value: ExecaReturnValue<string>;
  };
  InstallBegin: PackItem[];
  InstallFailed: ExecaError | Error;
  InstallOk: PackItem[];
  RunScriptsBegin: {scripts: string[]; packItems: PackItem[]; total: number};
  RunScriptsFailed: {
    total: number;
    executed: number;
    failures: number;
    results: ExecaReturnValue<string | ExecaError>[];
  };
  RunScriptsOk: {
    total: number;
    executed: number;
    failures: number;
    results: ExecaReturnValue<string>[];
    scripts: string[];
  };
  RunScriptBegin: {
    script: string;
    cwd: string;
    npmArgs: string[];
    pkgName: string;
    total: number;
    current: number;
  };
  RunScriptFailed: {
    error: ExecaReturnValue<string> | ExecaError;
    total: number;
    current: number;
  };
  RunScriptOk: {
    value: ExecaReturnValue<string>;
    current: number;
    total: number;
  };
}

export type TSmokerEmitter = StrictEventEmitter<EventEmitter, Events>;
