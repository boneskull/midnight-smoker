import {NonEmptyNonEmptyStringArraySchema} from '#schema/util/util';
import {parse, valid} from 'semver';
import {z} from 'zod';

/**
 * Data object for `normalizeVersion`
 */
export type PkgManagerVersionData = {
  [x: string]: unknown;
  tags?: Record<string, string>;
  versions: string[];
};

export type RawPkgManagerVersionData = PkgManagerVersionData | string[];

const versionDataShape = {
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

  /**
   * Array of known version numbers for a package manager
   */
  versions: NonEmptyNonEmptyStringArraySchema.refine((value) =>
    value.every((ver) => valid(ver, true)),
  )
    .transform((value) => value.map((ver) => parse(ver, true)!.format()))
    .describe('Array of known version numbers for a package manager'),
} as const satisfies z.ZodRawShape;

/**
 * Schema for a version data object for `normalizeVersion`
 */
export const PkgManagerVersionDataSchema: z.ZodType<PkgManagerVersionData> = z
  .object(versionDataShape)
  .passthrough();

/**
 * Schema for an array of versions for `normalizeVersion`
 */
const PkgManagerVersionDataArraySchema = versionDataShape.versions
  .transform((value) => ({
    versions: value,
  }))
  .pipe(PkgManagerVersionDataSchema);

/**
 * Schema for version data for `normalizeVersion`
 */
export const RawPkgManagerVersionDataSchema =
  PkgManagerVersionDataArraySchema.or(PkgManagerVersionDataSchema).describe(
    'An array of versions or an object containing versions and tags, representing known package manager versions',
  );
