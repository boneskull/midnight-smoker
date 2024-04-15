import {PackError, PackParseError} from '#error';
import {type PackEvent} from '#event/event-constants';
import {InstallEventBaseDataSchema} from '#schema/install-event';
import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';
import {PackOptionsSchema} from './pack-options';
import {PkgManagerEventBaseSchema} from './pkg-manager-event';

/**
 * {@inheritDoc PackBeginEventDataSchema}
 */
export type PackBeginEventData = z.infer<typeof PackBeginEventDataSchema>;

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

  [PackEvent.PkgManagerPackBegin]: PkgManagerPackBeginEventData;

  [PackEvent.PkgManagerPackFailed]: PkgManagerPackFailedEventData;

  [PackEvent.PkgManagerPackOk]: PkgManagerPackOkEventData;
};

/**
 * {@inheritDoc PackFailedEventDataSchema}
 */
export type PackFailedEventData = z.infer<typeof PackFailedEventDataSchema>;

/**
 * {@inheritDoc PackOkEventDataSchema}
 */
export type PackOkEventData = z.infer<typeof PackOkEventDataSchema>;

export type PkgManagerPackBeginEventData = z.infer<
  typeof PkgManagerPackBeginEventDataSchema
>;

export type PkgManagerPackFailedEventData = z.infer<
  typeof PkgManagerPackFailedEventDataSchema
>;

export type PkgManagerPackOkEventData = z.infer<
  typeof PkgManagerPackOkEventDataSchema
>;

/**
 * Data for the `PackBegin` event
 */
export const PackBeginEventDataSchema = z.object({
  /**
   * List of unique package manager specifiers, each of which corresponding to a
   * package manager which will perform a "pack" operation.
   */
  pkgManagers: InstallEventBaseDataSchema.shape.pkgManagers,

  packOptions: PackOptionsSchema.optional(),
});

export const PackingErrorSchema = instanceofSchema(PackError).or(
  instanceofSchema(PackParseError),
);

/**
 * Data for the `PackOk` event
 */
export const PackOkEventDataSchema = PackBeginEventDataSchema.extend({
  uniquePkgs: InstallEventBaseDataSchema.shape.uniquePkgs,
  manifests: InstallEventBaseDataSchema.shape.manifests,
  total: InstallEventBaseDataSchema.shape.total,
});

/**
 * Data for the `PackFailed` event
 */
export const PackFailedEventDataSchema = PackBeginEventDataSchema.extend({
  error: PackingErrorSchema,
});

export const PkgManagerPackBeginEventDataSchema =
  PkgManagerEventBaseSchema.extend({
    packOptions: PackOptionsSchema.optional(),
  });

export const PkgManagerPackFailedEventDataSchema =
  PkgManagerPackBeginEventDataSchema.extend({
    error: PackingErrorSchema,
  });

export const PkgManagerPackOkEventDataSchema =
  PkgManagerPackBeginEventDataSchema.extend({
    manifests: InstallEventBaseDataSchema.shape.manifests,
  });
