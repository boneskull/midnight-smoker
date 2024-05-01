import {PackError, PackParseError} from '#error';
import {PackEvent} from '#event/event-constants';
import {InstallEventBaseDataSchema} from '#schema/install-event';
import {PackOptionsSchema} from '#schema/pack-options';
import {PkgManagerEventBaseSchema} from '#schema/pkg-manager-event';
import {StaticPkgManagerSpecSchema} from '#schema/static-pkg-manager-spec';
import {WorkspaceInfoSchema} from '#schema/workspaces';
import {
  NonEmptyStringSchema,
  NonNegativeIntSchema,
  instanceofSchema,
} from '#util/schema-util';
import {z} from 'zod';

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

  [PackEvent.PkgPackBegin]: PkgPackBeginEventData;

  [PackEvent.PkgPackFailed]: PkgPackFailedEventData;

  [PackEvent.PkgPackOk]: PkgPackOkEventData;
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

export type PkgPackBeginEventData = z.infer<typeof PkgPackBeginEventDataSchema>;

export type PkgPackFailedEventData = z.infer<
  typeof PkgPackFailedEventDataSchema
>;

export type PkgPackOkEventData = z.infer<typeof PkgPackOkEventDataSchema>;

export const PackEventBaseDataSchema = z.object({
  /**
   * List of unique package manager specifiers, each of which corresponding to a
   * package manager which will perform a "pack" operation.
   */
  pkgManagers: InstallEventBaseDataSchema.shape.pkgManagers,

  packOptions: PackOptionsSchema.optional(),

  workspaceInfo: z.array(WorkspaceInfoSchema),
});

/**
 * Data for the `PackBegin` event
 */
export const PackBeginEventDataSchema = PackEventBaseDataSchema;

export const PackingErrorSchema = instanceofSchema(PackError).or(
  instanceofSchema(PackParseError),
);

/**
 * Data for the `PackOk` event
 */
export const PackOkEventDataSchema = PackBeginEventDataSchema.extend({
  uniquePkgs: InstallEventBaseDataSchema.shape.uniquePkgs,
  manifests: InstallEventBaseDataSchema.shape.manifests,
  totalPkgs: InstallEventBaseDataSchema.shape.totalPkgs,
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

export const PkgPackBeginEventDataSchema = z.object({
  workspace: WorkspaceInfoSchema,
  localPath: NonEmptyStringSchema,
  pkgManager: StaticPkgManagerSpecSchema,
  totalPkgs: NonNegativeIntSchema,
  currentPkg: NonNegativeIntSchema,
});

export const PkgPackOkEventDataSchema = PkgPackBeginEventDataSchema;

export const PkgPackFailedEventDataSchema = PkgPackBeginEventDataSchema.extend({
  error: PackingErrorSchema,
});

export const PackEventSchemas = {
  [PackEvent.PackBegin]: PackBeginEventDataSchema,
  [PackEvent.PackOk]: PackOkEventDataSchema,
  [PackEvent.PackFailed]: PackFailedEventDataSchema,
  [PackEvent.PkgManagerPackBegin]: PkgManagerPackBeginEventDataSchema,
  [PackEvent.PkgManagerPackFailed]: PkgManagerPackFailedEventDataSchema,
  [PackEvent.PkgManagerPackOk]: PkgManagerPackOkEventDataSchema,
  [PackEvent.PkgPackBegin]: PkgPackBeginEventDataSchema,
  [PackEvent.PkgPackOk]: PkgPackOkEventDataSchema,
  [PackEvent.PkgPackFailed]: PkgPackFailedEventDataSchema,
} as const;
