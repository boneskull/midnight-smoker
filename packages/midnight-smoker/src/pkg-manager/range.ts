import type {PkgManager} from '#defs/pkg-manager';

import {RangeSchema} from '#schema/version';
import {memoize} from 'lodash';
import {type Range} from 'semver';

/**
 * Parses the range of versions supported by a package manager from the
 * `supportedVesrionRange` field and caches it.
 *
 * @param pkgManager `PkgManager` instance
 * @returns SemVer {@link Range}
 */
export const getRange = memoize(
  (pkgManager: PkgManager): Range =>
    RangeSchema.parse(pkgManager.supportedVersionRange),
);
