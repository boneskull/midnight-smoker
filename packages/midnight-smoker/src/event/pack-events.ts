import {type PackError} from '#error/pack-error';
import {type SomePackError} from '#error/some-pack-error';
import type * as Schema from '#schema/meta/for-pack-events';
import {type Result} from '#util/result';
import type {PackEvent} from '../constants/event';
import {type PackParseError} from '../error/pack-parse-error';
import type {PkgManagerEventBase} from './common';

export interface PackEventData {
  /**
   * Emitted whenever a package is about to be packed into a tarball.
   *
   * @event
   */
  [PackEvent.PackBegin]: PackBeginEventData;

  /**
   * Emitted whenever a package is packed successfully into a tarball.
   *
   * @event
   */
  [PackEvent.PackOk]: PackOkEventData;

  /**
   * Emitted whenever packing a tarball fails.
   *
   * This is considered unrecoverable, and `midnight-smoker` will exit with a
   * non-zero code soon thereafter.
   *
   * @event
   */
  [PackEvent.PackFailed]: PackFailedEventData;

  [PackEvent.PkgManagerPackBegin]: PkgManagerPackBeginEventData;

  [PackEvent.PkgManagerPackFailed]: PkgManagerPackFailedEventData;

  [PackEvent.PkgManagerPackOk]: PkgManagerPackOkEventData;

  [PackEvent.PkgPackBegin]: PkgPackBeginEventData;

  [PackEvent.PkgPackFailed]: PkgPackFailedEventData;

  [PackEvent.PkgPackOk]: PkgPackOkEventData;
}

export interface PkgPackEventDataBase {
  workspace: Result<Schema.WorkspaceInfo>;
  pkgManager: Schema.StaticPkgManagerSpec;
  totalPkgs: number;
}

export interface PkgPackBeginEventData extends PkgPackEventDataBase {}

export interface PkgPackOkEventData extends PkgPackEventDataBase {
  installManifest: Result<Schema.InstallManifest>;
}

export interface PkgPackFailedEventData extends PkgPackEventDataBase {
  error: PackError | PackParseError;
}

export interface PkgManagerPackEventDataBase extends PkgManagerEventBase {
  workspaceInfo: Result<Schema.WorkspaceInfo>[];
  packOptions?: Schema.PackOptions;
}

export interface PkgManagerPackBeginEventData
  extends PkgManagerPackEventDataBase {}

export interface PkgManagerPackFailedEventData
  extends PkgManagerPackEventDataBase {
  error: SomePackError;
}

export interface PkgManagerPackOkEventData extends PkgManagerPackEventDataBase {
  manifests: Schema.InstallManifest[];
}

export interface PackEventDataBase {
  pkgManagers: Schema.StaticPkgManagerSpec[];
  workspaceInfo: Schema.WorkspaceInfo[];
  packOptions?: Schema.PackOptions;
}

export interface PackBeginEventData extends PackEventDataBase {}

export interface PackOkEventData extends PackEventDataBase {}

export interface PackFailedEventData extends PackEventDataBase {
  error: SomePackError;
}
