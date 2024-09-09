import type * as Schema from '#schema/meta/for-pack-events';

import {PackEvents} from '#constants/event';
import {type SomePackError} from '#error/some-pack-error';
import {type Result} from '#util/result';

import {type PkgEventBase, type PkgManagerEventBase} from './common.js';

export {PackEvents};

export type PackBeginEventData = PackEventBase;

export type PackEventData = {
  /**
   * Emitted whenever a package is about to be packed into a tarball.
   *
   * @event
   */
  [PackEvents.PackBegin]: PackBeginEventData;

  /**
   * Emitted whenever packing a tarball fails.
   *
   * This is considered unrecoverable, and `midnight-smoker` will exit with a
   * non-zero code soon thereafter.
   *
   * @event
   */
  [PackEvents.PackFailed]: PackFailedEventData;

  /**
   * Emitted whenever a package is packed successfully into a tarball.
   *
   * @event
   */
  [PackEvents.PackOk]: PackOkEventData;

  [PackEvents.PkgManagerPackBegin]: PkgManagerPackBeginEventData;

  [PackEvents.PkgManagerPackFailed]: PkgManagerPackFailedEventData;

  [PackEvents.PkgManagerPackOk]: PkgManagerPackOkEventData;

  [PackEvents.PkgPackBegin]: PkgPackBeginEventData;

  [PackEvents.PkgPackFailed]: PkgPackFailedEventData;

  [PackEvents.PkgPackOk]: PkgPackOkEventData;
};

export type PackEventBase = {
  packOptions?: Schema.PackOptions;
  pkgManagers: Schema.StaticPkgManagerSpec[];
  workspaceInfo: Schema.WorkspaceInfo[];
};

export type PackFailedEventData = {
  error: SomePackError;
} & PackEventBase;

export type PackOkEventData = PackEventBase;

export type PkgManagerPackBeginEventData = PkgManagerPackEventDataBase;

export type PkgManagerPackEventDataBase = {
  packOptions?: Schema.PackOptions;
} & PkgManagerEventBase;

export type PkgManagerPackFailedEventData = {
  error: SomePackError;
} & PkgManagerPackEventDataBase;

export type PkgManagerPackOkEventData = {
  manifests: Schema.InstallManifest[];
} & PkgManagerPackEventDataBase;

export type PkgPackBeginEventData = PkgEventBase;

export type PkgPackFailedEventData = {
  error: SomePackError;
} & PkgEventBase;

export type PkgPackOkEventData = {
  installManifest: Result<Schema.InstallManifest>;
} & PkgEventBase;
