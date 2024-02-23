import {
  type InstallBeginEventData,
  type InstallFailedEventData,
  type InstallOkEventData,
} from '#schema/install-event';

export type InstallEvents = {
  /**
   * Emitted whenever a package is about to be installed (from a tarball) into
   * its temp directory.
   *
   * Should happen once per package.
   *
   * @event
   */
  InstallBegin: InstallBeginEventData;

  /**
   * Emitted when a package fails to install.
   *
   * This is considered unrecoverable, and `midnight-smoker` will exit with a
   * non-zero code soon thereafter.
   *
   * @event
   */
  InstallFailed: InstallFailedEventData;

  /**
   * Emitted when a package is installed successfully from a tarball.
   *
   * @event
   */
  InstallOk: InstallOkEventData;
}; /**
 * Data emitted by various {@link SmokerEvent events}.
 *
 * @see {@link SmokerEvents}
 */
