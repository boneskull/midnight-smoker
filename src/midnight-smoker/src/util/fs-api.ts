import {type FsCapabilities, type OsCapabilties} from '#capabilities';
import {type NormalizedPackageJson} from '#schema/package-json';
import {type PackageJson} from 'type-fest';

export interface FileManagerOptions {
  fs?: FsCapabilities;
  os?: Partial<OsCapabilties>;
}

export interface ReadPkgJsonNormalizedResult {
  packageJson: NormalizedPackageJson;
  path: string;

  rawPackageJson: string;
}

export interface ReadPkgJsonOptions {
  normalize?: boolean;
  signal?: AbortSignal;
  strict?: boolean;
}

export interface ReadPkgJsonStrictOptions extends ReadPkgJsonOptions {
  strict: true;
}

export interface ReadPkgJsonNormalizeOptions extends ReadPkgJsonOptions {
  normalize: true;
}

export interface FindPkgJsonResult {
  packageJson: PackageJson;

  path: string;

  rawPackageJson: string;
}
