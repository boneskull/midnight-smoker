import {NonEmptyStringSchema} from '#schema/util/util';
import {SemVerRangeSchema} from '#util/schema-util';
import {parse, Range, valid, validRange} from 'semver';

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
