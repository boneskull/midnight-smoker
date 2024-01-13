import {maxSatisfying, parse, valid, validRange, type SemVer} from 'semver';
import type {StringKeyOf} from 'type-fest';
import npmDistTags from '../../../data/npm-dist-tags.json';
import npmVersions from '../../../data/npm-versions.json';
import yarnDistTags from '../../../data/yarn-dist-tags.json';
import yarnTags from '../../../data/yarn-tags.json';
import yarnVersions from '../../../data/yarn-versions.json';
import {
  UnknownDistTagError,
  UnknownVersionError,
  UnknownVersionRangeError,
  UnsupportedPackageManagerError,
} from '../../error/pkg-manager-error';

/**
 * Known versions of supported package managers
 */
export const Versions = {
  npm: new Set(npmVersions),
  yarn: new Set([...yarnVersions, ...yarnTags.tags]),
} as const;

/**
 * Known dist tags of supported package managers
 */
export const DistTags = {
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
export function isKnownDistTag<P extends StringKeyOf<typeof DistTags>>(
  name: P,
  tag: string,
): tag is StringKeyOf<(typeof DistTags)[P]> {
  return tag in DistTags[name];
}

export function isKnownPkgManager(name: string): name is keyof typeof Versions {
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
export function normalizeVersion(name: string, version?: string): SemVer {
  version = version?.length ? version : 'latest';

  if (!isKnownPkgManager(name)) {
    throw new UnsupportedPackageManagerError(
      `${name} is currently unsupported`,
      name,
      version,
    );
  }

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

  const distTags = DistTags[name];
  if (isKnownDistTag(name, version)) {
    return parse(distTags[version])!;
  } else {
    throw new UnknownDistTagError(
      `Unknown version/tag "${version}" for package manager "${name}"`,
      name,
      version,
    );
  }
}
