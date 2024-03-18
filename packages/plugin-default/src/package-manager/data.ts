/**
 * This just re-exports a bunch of verison/tag data for use with
 * `midnight-smoker/pkg-manager`'s `normalizeVersion()`
 *
 * @packageDocumentation
 */

import {type VersionData} from 'midnight-smoker/pkg-manager';
import npmDistTags from '../../data/npm-dist-tags.json';
import npmVersions from '../../data/npm-versions.json';
import pnpmDistTags from '../../data/pnpm-dist-tags.json';
import pnpmVersions from '../../data/pnpm-versions.json';
import yarnLegacyDistTags from '../../data/yarn-dist-tags.json';
import {
  latest as yarnDistTags,
  tags as yarnVersions,
} from '../../data/yarn-tags.json';
import yarnLegacyVersions from '../../data/yarn-versions.json';

const allYarnVersions = [...new Set([...yarnVersions, ...yarnLegacyVersions])];

export const npmVersionData = {
  tags: npmDistTags,
  versions: npmVersions,
} as const satisfies VersionData;

export const yarnVersionData = {
  tags: {...yarnDistTags, ...yarnLegacyDistTags},
  versions: allYarnVersions,
} as const satisfies VersionData;

export const pnpmVersionData = {
  tags: pnpmDistTags,
  versions: pnpmVersions,
} as const satisfies VersionData;
