import {
  type PackBeginEventData,
  type PackFailedEventData,
  type PackOkEventData,
} from '#schema/pack-event';

export type PackEvents = {
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
  PackFailed: PackFailedEventData;

  /**
   * Emitted whenever a package is packed successfully into a tarball.
   *
   * @event
   */
  PackOk: PackOkEventData;
};
