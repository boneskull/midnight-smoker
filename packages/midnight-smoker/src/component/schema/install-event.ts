import {InstallError} from '#error/install-error';
import {type InstallEvent} from '#event/event-constants';
import {InstallManifestSchema} from '#schema/install-manifest';
import {
  NonEmptyNonEmptyStringArraySchema,
  NonEmptyStringArraySchema,
  NonNegativeIntSchema,
  instanceofSchema,
} from '#util/schema-util';
import {z} from 'zod';
import {StaticPkgManagerSpecSchema} from './static-pkg-manager-spec';

export type InstallBeginEventData = z.infer<typeof InstallBeginEventDataSchema>;
export type InstallEventBaseData = z.infer<typeof InstallEventBaseDataSchema>;
export type InstallFailedEventData = z.infer<
  typeof InstallFailedEventDataSchema
>;
export type InstallOkEventData = z.infer<typeof InstallOkEventDataSchema>;

/**
 * Base data for all install events
 */
export const InstallEventBaseDataSchema = z.object({
  /**
   * List of unique package names which either will be or have been installed
   * (depending on context).
   */
  uniquePkgs: NonEmptyNonEmptyStringArraySchema,

  /**
   * List of unique package managers
   */
  pkgManagers: z.array(StaticPkgManagerSpecSchema),

  /**
   * A list of objects describing what packages to install where, and what
   * additional deps to install (if any).
   */
  manifests: z.array(InstallManifestSchema),

  /**
   * A unique list of additional dependencies to install (if any), flatted from
   * {@link manifests}
   */
  additionalDeps: NonEmptyStringArraySchema,

  /**
   * Total number of packages to install
   */
  total: NonNegativeIntSchema,
});

/**
 * Data for the `InstallBegin` event
 */
export const InstallBeginEventDataSchema = InstallEventBaseDataSchema;

/**
 * Data for the `InstallOk` event
 */
export const InstallOkEventDataSchema = InstallEventBaseDataSchema.extend({
  current: NonNegativeIntSchema,
});

/**
 * Data for the `InstallFailed` event
 */
export const InstallFailedEventDataSchema = InstallOkEventDataSchema.extend({
  error: instanceofSchema(InstallError),
});

export type InstallEventData = {
  [InstallEvent.InstallBegin]: InstallBeginEventData;
  [InstallEvent.InstallOk]: InstallOkEventData;
  [InstallEvent.InstallFailed]: InstallFailedEventData;
};
