/**
 * Normalizes package manager versions.
 *
 * @packageDocumentation
 * @see {@link normalizeVersion}
 */

import {NonEmptyStringSchema, SemVerSchema} from '#util/schema-util';
import {curry} from 'lodash';
import {maxSatisfying, parse, valid, validRange, type SemVer} from 'semver';
import {z} from 'zod';
import {VersionDataSchema, type VersionData} from '../schema/version';

/**
 * Schema for {@link _normalizeVersion}
 */
export const NormalizeVersionSchema = z.function(
  z.tuple([VersionDataSchema, NonEmptyStringSchema] as [
    versionData: typeof VersionDataSchema,
    value: typeof NonEmptyStringSchema,
  ]),
  SemVerSchema.or(z.undefined()),
);

/**
 * Normalizes a valid version from a set of versions.
 *
 * @param versions - The set of versions to check against.
 * @param version - The version to normalize - must be valid version.
 * @returns The normalized version as a SemVer object, or undefined if the
 *   version is not found in the set.
 */
function normalizeValidVersion(
  versions: Set<string>,
  version: string,
): SemVer | undefined {
  if (versions.has(version)) {
    return parse(version) || undefined;
  }
}

/**
 * Normalizes a valid range of versions against a set of available versions.
 *
 * @param versions - The set of available versions.
 * @param range - The range of versions to normalize - must be valid range.
 * @returns The normalized version as a SemVer object, or undefined if no valid
 *   version is found.
 */
function normalizeValidRange(
  versions: Set<string>,
  range: string,
): SemVer | undefined {
  const version = maxSatisfying([...versions], range, true);
  if (version) {
    return parse(version) || undefined;
  }
}

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
function normalizeValidTag(
  tags: Map<string, string>,
  tag: string,
): SemVer | undefined {
  if (tags.has(tag)) {
    const version = tags.get(tag)!;
    return parse(version) || undefined;
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
 * To be used by `PkgManagerDef.accepts`
 *
 * @remarks
 * This exists because `corepack` expects a SemVer version and not a _range_.
 * Something like `8` is considered a range.
 * @param versionData - Object containing known versions and optionally dist
 *   tags
 * @param value - Version, version range, or dist tag to normalize
 * @returns SemVer version string or `undefined` if not found / unparseable
 */
const _normalizeVersion = (
  versionData: VersionData,
  value: string,
): SemVer | undefined => {
  const versions = new Set(versionData.versions);
  const tags = new Map(Object.entries(versionData.tags ?? {}));

  if (valid(value)) {
    return normalizeValidVersion(versions, value);
  }
  if (validRange(value)) {
    return normalizeValidRange(versions, value);
  }
  return normalizeValidTag(tags, value);
};

/**
 * {@inheritDoc _normalizeVersion}
 */
export const normalizeVersion = curry(
  NormalizeVersionSchema.implement(_normalizeVersion),
  2,
);
