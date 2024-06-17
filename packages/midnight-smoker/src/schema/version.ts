import {NonEmptyNonEmptyStringArraySchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * Schema for a version data object for {@link normalizeVersion}
 */

export const VersionDataObjectSchema = z.object({
  /**
   * Array of known version numbers for a package manager
   */
  versions: NonEmptyNonEmptyStringArraySchema.describe(
    'Array of known version numbers for a package manager',
  ),

  /**
   * Object with keys as dist-tags and values as version numbers (for a package
   * manager)
   */
  tags: z
    .record(z.string())
    .default({})
    .describe(
      'Object with keys as dist-tags and values as version numbers (for a package manager)',
    ),
});

/**
 * Schema for an array of versions for {@link normalizeVersion}
 */

export const VersionDataVersionsSchema =
  NonEmptyNonEmptyStringArraySchema.transform((value) => ({
    versions: value,
  })).pipe(VersionDataObjectSchema);

/**
 * Schema for version data for {@link normalizeVersion}
 */

export const VersionDataSchema = z.union([
  VersionDataObjectSchema,
  VersionDataVersionsSchema,
]);

/**
 * Data object for {@link normalizeVersion}
 */
export type VersionData = z.infer<typeof VersionDataSchema>;
