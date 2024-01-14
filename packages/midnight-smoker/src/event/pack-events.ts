import type {PackError} from '../component/package-manager/errors/pack-error';
import type {InstallEventData} from './install-events';

export interface PackEvents {
  /**
   * Emitted whenever a package is about to be packed into a tarball.
   *
   * @event
   */
  PackBegin: PackBeginEventData;

  /**
   * Emitted whenever packing a tarball fails.
   *
   * This is considered unrecoverable, and `midnight-smoker` will exit with a
   * non-zero code soon thereafter.
   *
   * @event
   */
  PackFailed: PackError;

  /**
   * Emitted whenever a package is packed successfully into a tarball.
   *
   * @event
   */
  PackOk: PackOkEventData;
}
export interface PackBeginEventData {
  /**
   * List of unique package manager specifiers, each of which corresponding to a
   * package manager which will perform a "pack" operation.
   */
  packageManagers: string[];
}
export type PackOkEventData = InstallEventData;
