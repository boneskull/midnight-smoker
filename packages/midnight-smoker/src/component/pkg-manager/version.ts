/**
 * Normalizes package manager versions.
 *
 * @packageDocumentation
 * @see {@link normalizeVersion}
 * @todo The information in `Versions` and `DistTags` needs to move into the
 *   `plugin-default` plugin. It may be prudent to allow PM implementations to
 *   provide this information themselves.
 */

import {maxSatisfying, parse, valid, validRange, type SemVer} from 'semver';
import type {StringKeyOf} from 'type-fest';
import npmDistTags from '../../../data/npm-dist-tags.json';
import npmVersions from '../../../data/npm-versions.json';
import yarnDistTags from '../../../data/yarn-dist-tags.json';
import yarnTags from '../../../data/yarn-tags.json';
import yarnVersions from '../../../data/yarn-versions.json';
import {DEFAULT_PKG_MANAGER_VERSION} from '../../constants';
import {UnknownDistTagError} from '../../error/unknown-dist-tag-error';
import {UnknownVersionError} from '../../error/unknown-version-error';
import {UnknownVersionRangeError} from '../../error/unknown-version-range-error';

/**
 * Known versions of supported package managers
 */
const Versions = {
  npm: new Set(npmVersions),
  yarn: new Set([...yarnVersions, ...yarnTags.tags]),
} as const;

/**
 * Known dist tags of supported package managers
 */
const DistTags = {
  npm: npmDistTags,
  yarn: {
    ...yarnDistTags,
    ...yarnTags.latest,
  },
} as const satisfies Record<keyof typeof Versions, Record<string, string>>;

/**
 * Checks if a given tag is a known distribution tag for a package manager.
 *
 * @param name - The {@link DistTags package manager name}
 * @param tag - The tag to check.
 * @returns A boolean indicating whether the tag is a known distribution tag.
 */
function hasDistTag<P extends keyof typeof DistTags>(
  name: P,
  tag: string,
): tag is StringKeyOf<(typeof DistTags)[P]> {
  return tag in DistTags[name];
}

/**
 * Returns `true` if the given pkg manager is a property of {@link DistTags}
 *
 * @param name - Pkg manager name
 * @returns Pkg manager name is a property of {@link DistTags}
 */
function isKnownPkgManagerByDistTag(
  name: string,
): name is keyof typeof DistTags {
  return name in DistTags;
}

/**
 * Returns `true` if the given package manager is a property of {@link Versions}
 *
 * @param name - Package manager name
 * @returns Package manager name is a property of {@link Versions}
 */
function isKnownPkgManagerByVersion(
  name: string,
): name is keyof typeof Versions {
  return name in Versions;
}

/**
 * Given a package manager and optionally a version (or dist tag), validate it
 * and return the semver version.
 *
 * This exists because `corepack` expects a SemVer version and not a _range_.
 * Something like "8" is considered a range. This will find the latest version
 * matching the range.
 *
 * @param name Package manager name
 * @param version Version or dist tag
 * @returns SemVer version string
 */
export function normalizeVersion(
  name: string,
  version?: string,
): SemVer | undefined {
  version = version?.length ? version : DEFAULT_PKG_MANAGER_VERSION;

  if (isKnownPkgManagerByVersion(name)) {
    const versions = Versions[name];
    if (valid(version)) {
      if (versions.has(version)) {
        return parse(version)!;
      }
      throw new UnknownVersionError(
        `Unknown version "${version}" of package manager "${name}"`,
        name,
        version,
      );
    }

    const range = validRange(version);
    if (range) {
      const max = maxSatisfying([...versions], range, true);
      if (!max) {
        throw new UnknownVersionRangeError(
          `No version found for package manager "${name}" matching range "${version}"`,
          name,
          version,
        );
      }
      return parse(max)!;
    }
  }

  if (isKnownPkgManagerByDistTag(name)) {
    const distTags = DistTags[name];
    if (hasDistTag(name, version)) {
      return parse(distTags[version])!;
    } else {
      throw new UnknownDistTagError(
        `Unknown version/tag "${version}" for package manager "${name}"`,
        name,
        version,
      );
    }
  }

  try {
    const result = parse(version);
    if (result) {
      return result;
    }
  } catch {}
}
