import fs from 'node:fs/promises';
import path from 'node:path';
import {valid, validRange, maxSatisfying, type SemVer, parse} from 'semver';
import {SmokerError} from '../error';
import {findDataDir} from '../util';

async function cachedRead<T = unknown>(filename: string): Promise<T> {
  if (cachedRead.cache.has(filename)) {
    return cachedRead.cache.get(filename)!;
  }
  const result = JSON.parse(await fs.readFile(filename, 'utf8'));
  cachedRead.cache.set(filename, result);
  return result;
}
cachedRead.cache = new Map<string, any>();

async function readDistTags(name: string): Promise<Record<string, string>> {
  const dataDir = await findDataDir();
  const distTagsPath = path.join(dataDir, `${name}-dist-tags.json`);
  let disttags = await cachedRead<Record<string, string>>(distTagsPath);
  if (name === 'yarn') {
    const yarnTags = await cachedRead<{
      latest: {stable: string; canary: string};
    }>(path.join(dataDir, 'yarn-tags.json'));
    disttags = {...disttags, ...yarnTags.latest};
  }
  return disttags;
}

async function readVersions(name: string): Promise<Set<string>> {
  const dataDir = await findDataDir();
  const versionsPath = path.join(dataDir, `${name}-versions.json`);
  let versions = JSON.parse(await fs.readFile(versionsPath, 'utf8'));
  if (name === 'yarn') {
    const yarnTags = await cachedRead<{tags: string[]}>(
      path.join(dataDir, 'yarn-tags.json'),
    );
    versions = [...versions, ...yarnTags.tags];
  }
  return new Set(versions);
}

/**
 * Given a package manager and optionally a version (or dist tag), validate it and return the semver version.
 *
 * This exists because `corepack` expects a SemVer version and not a _range_.  Something like "8" is considered a range. This will find the latest version matching the range.
 * @param name Package manager name
 * @param version Version or dist tag
 * @returns SemVer version string
 */
export async function normalizeVersion(
  name: string,
  version?: string,
): Promise<SemVer> {
  version = version?.length ? version : 'latest';

  const versions = await readVersions(name);

  if (valid(version)) {
    if (versions.has(version)) {
      return parse(version)!;
    }
    throw new SmokerError(
      `(normalizeVersion) Unknown version "${version}" for package manager "${name}"`,
    );
  }

  const range = validRange(version);
  if (range) {
    const max = maxSatisfying([...versions], range, true);
    if (!max) {
      throw new SmokerError(
        `(normalizeVersion) No version found for "${name}" matching range "${version}"`,
      );
    }
    return parse(max)!;
  }

  const distTags = await readDistTags(name);
  if (version in distTags) {
    return parse(distTags[version])!;
  } else {
    throw new SmokerError(
      `(normalizeVersion) Unknown version/tag "${version}" for package manager "${name}"`,
    );
  }
}
