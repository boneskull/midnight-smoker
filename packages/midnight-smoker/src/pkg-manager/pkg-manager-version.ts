/**
 * Normalizes package manager versions.
 *
 * @packageDocumentation
 * @see {@link normalizeVersion}
 */
import {asValidationError} from '#error/validation-error';
import {
  parseRange,
  type PkgManagerVersionData,
  type RawPkgManagerVersionData,
  RawPkgManagerVersionDataSchema,
  VersionStringSchema,
} from '#schema/version';
import {createDebug} from '#util/debug';
import {NonEmptyStringSchema} from '#util/schema-util';
import {maxSatisfying, parse, type SemVer} from 'semver';

/**
 * A function accepting a version or tag and returning a {@link SemVer} if it can
 * be matched to a known version
 */
export type VersionNormalizer = (value: string) => SemVer | undefined;

/**
 * Normalizes a valid tag by retrieving its corresponding version from a map of
 * tags.
 *
 * @param tags - A map of tags where the key is the tag name and the value is
 *   the version.
 * @param tag - The tag to normalize.
 * @returns The normalized SemVer version or undefined if the tag is not found
 *   in the map.
 */
function matchTag(tags: Map<string, string>, tag: string): string | undefined {
  return tags.get(tag);
}

/**
 * Normalizes a valid version from a set of versions.
 *
 * @param versions - The set of versions to check against.
 * @param allegedVersion - The version to normalize - must be valid version.
 * @returns The normalized version as a SemVer object, or undefined if the
 *   version is not found in the set.
 */
function matchVersion(
  versions: Set<string>,
  allegedVersion: string,
): string | undefined {
  const result = VersionStringSchema.safeParse(allegedVersion);
  if (result.success && versions.has(result.data)) {
    return result.data;
  }
}

/**
 * Normalizes a valid range of versions against a set of available versions.
 *
 * @param versions - The set of available versions.
 * @param allegedRange - The range of versions to normalize - must be valid
 *   range.
 * @returns The normalized version as a SemVer object, or undefined if no valid
 *   version is found.
 */
function matchVersionFromRange(
  versions: Set<string>,
  allegedRange: string,
): string | undefined {
  const range = parseRange(allegedRange);
  if (range) {
    return maxSatisfying([...versions], range, true) || undefined;
  }
}

/**
 * Converts a version string, version range, or dist tag to a `SemVer` object,
 * given version data about a package manager.
 *
 * When provided a range, will return the maximum satisfying version.
 *
 * In case a value matches multiple types, the order of precedence is:
 *
 * 1. Version
 * 2. Range
 * 3. Tag
 *
 * To be used by `PkgManager.accepts`
 *
 * @remarks
 * This exists because `corepack` expects a SemVer version and not a _range_.
 * Something like `8` is considered a range.
 *
 * Also: `curry` from `lodash` wasn't cutting it due to its flimsy type-safety.
 * @param versionData - Object containing known versions and optionally dist
 *   tags
 * @param value - The version, range, or tag to normalize
 * @returns If `value` is omitted, returns a function which accepts a value;
 *   otherwise normalizes the value and returns the result.
 */
export function normalizeVersion(
  versionData: RawPkgManagerVersionData,
): VersionNormalizer;

export function normalizeVersion(
  versionData: RawPkgManagerVersionData,
  value: string,
): SemVer | undefined;

export function normalizeVersion(
  rawVersionData: RawPkgManagerVersionData,
  value?: string,
) {
  let versionData: PkgManagerVersionData;
  try {
    versionData = RawPkgManagerVersionDataSchema.parse(rawVersionData);
  } catch (err) {
    throw asValidationError(err);
  }

  const normalizer: VersionNormalizer = (value: string): SemVer | undefined => {
    try {
      NonEmptyStringSchema.describe('Value to normalize').parse(value);
    } catch (err) {
      throw asValidationError(err);
    }

    const {tags = {}, versions} = versionData;
    const versionSet = new Set(versions);
    const tagMap = new Map(Object.entries(tags));

    let version: string | undefined;
    version ??= matchVersion(versionSet, value);
    version ??= matchVersionFromRange(versionSet, value);
    version ??= matchTag(tagMap, value);

    // load-bearing ||
    const result = parse(version) || undefined;
    if (result) {
      debug('Normalized version "%s" to "%s"', value, result);
    } else {
      debug('Could not normalize version "%s"', value);
    }
    return result;
  };

  if (arguments.length === 1) {
    return normalizer;
  }
  // TODO: file a feature request in TS for arguments-based inference
  return normalizer(value as string);
}

const debug = createDebug(__filename);
