import type {Smoker} from './src';

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
   * If `true`, suppress output from `npm`
   */
  quiet?: boolean;
  
}
