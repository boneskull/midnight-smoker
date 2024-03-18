import {PackError, PackParseError} from '#error';
import {type PackEvent} from '#event/event-constants';
import {InstallEventBaseDataSchema} from '#schema/install-event';
import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * {@inheritDoc PackBeginEventDataSchema}
 */
export type PackBeginEventData = z.infer<typeof PackBeginEventDataSchema>;

/**
 * {@inheritDoc PackFailedEventDataSchema}
 */
export type PackFailedEventData = z.infer<typeof PackFailedEventDataSchema>;

/**
 * {@inheritDoc PackOkEventDataSchema}
 */
export type PackOkEventData = z.infer<typeof PackOkEventDataSchema>;

/**
 * Data for the `PackBegin` event
 */
export const PackBeginEventDataSchema = z.object({
  /**
   * List of unique package manager specifiers, each of which corresponding to a
   * package manager which will perform a "pack" operation.
   */
  pkgManagers: InstallEventBaseDataSchema.shape.pkgManagers,

  /**
   * List of packages to pack
   */
  uniquePkgs: InstallEventBaseDataSchema.shape.uniquePkgs,
});

/**
 * Data for the `PackOk` event
 */
export const PackOkEventDataSchema = InstallEventBaseDataSchema;

/**
 * Data for the `PackFailed` event
 */
export const PackFailedEventDataSchema = PackBeginEventDataSchema.extend({
  error: instanceofSchema(PackError).or(instanceofSchema(PackParseError)),
});

export type PackEventData = {
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
};
