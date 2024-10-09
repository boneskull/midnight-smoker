import {
  NonEmptyNonEmptyStringArraySchema,
  NonEmptyStringSchema,
  SemVerRangeSchema,
} from '#util/schema-util';
import {parse, Range, valid, validRange} from 'semver';
import {z, type ZodRawShape} from 'zod';

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
} as const satisfies ZodRawShape;

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

export const VersionStringSchema = NonEmptyStringSchema.refine(
  (value) => valid(value, true),
  'Not a valid SemVer version',
).transform((value) => parse(value, true)!.format());

export const RangeStringSchema = NonEmptyStringSchema.refine(
  (value) => validRange(value),
  'Not a valid SemVer range',
)
  .transform((value) => new Range(value, true))
  .pipe(SemVerRangeSchema);

export const RangeSchema = SemVerRangeSchema.or(RangeStringSchema);

export function parseRange(
  value: Range | string,
  options: {strict: true},
): Range;

export function parseRange(
  value: Range | string,
  options?: {strict?: boolean},
): Range | undefined;

export function parseRange(
  value: Range | string,
  {strict = false}: {strict?: boolean} = {},
) {
  if (parseRangeCache.has(value)) {
    return parseRangeCache.get(value);
  }

  if (value instanceof Range) {
    parseRangeCache.set(value, value);
    return value;
  }

  if (strict) {
    const range = RangeSchema.parse(value);
    parseRangeCache.set(value, range);
    return range;
  }

  let result: ReturnType<typeof RangeSchema.safeParse>;
  if ((result = RangeSchema.safeParse(value)).success) {
    parseRangeCache.set(value, result.data);
    return result.data;
  }

  parseRangeCache.set(value, undefined);
}

const parseRangeCache = new Map<Range | string, Range | undefined>();

/**
 * Data object for `normalizeVersion`
 */
export type PkgManagerVersionData = {
  [x: string]: unknown;
  tags?: Record<string, string>;
  versions: string[];
};

export type RawPkgManagerVersionData = PkgManagerVersionData | string[];
