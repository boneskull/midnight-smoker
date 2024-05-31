import type fs from 'node:fs';
import type nodeFsPromises from 'node:fs/promises';
import type normalizePkgData from 'normalize-package-data';
import {type PackageJson} from 'type-fest';

export type FsApi = {
  existsSync: typeof fs.existsSync;
  readFileSync: typeof fs.readFileSync;
  promises: Pick<
    typeof nodeFsPromises,
    | 'mkdtemp'
    | 'rm'
    | 'readFile'
    | 'writeFile'
    | 'mkdir'
    | 'readdir'
    | 'stat'
    | 'lstat'
    | 'readlink'
    | 'realpath'
  >;
};

export type GetHomeDir = () => string;

export type GetTempDirRoot = () => string;

export type NormalizedPackageJson = PackageJson & normalizePkgData.Package;

export interface FileManagerOpts {
  fs?: FsApi;
  homedir?: GetHomeDir;
  tmpdir?: GetTempDirRoot;
}

export interface ReadPkgJsonNormalizedResult extends ReadPkgJsonResult {
  packageJson: NormalizedPackageJson;
}

export interface ReadPkgJsonOpts {
  normalize?: boolean;
  strict?: boolean;
}

export interface ReadPkgJsonResult {
  packageJson: PackageJson;
  path: string;
}
