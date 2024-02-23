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
  [PackEvent.PackBegin]: PackBeginEventData;
  [PackEvent.PackOk]: PackOkEventData;
  [PackEvent.PackFailed]: PackFailedEventData;
};
