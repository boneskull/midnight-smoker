// @ts-check

const path = require('node:path');
const fs = require('node:fs');

/**
 * Generates `entryPoints` for TypeDoc for a workspace.
 *
 * This inspects exports for the `typedoc` conditional, and uses that, if
 * present.
 *
 * This does not recurse exports.
 *
 * @param {string} cwd
 * @returns {Partial<import('typedoc').TypeDocOptions>}
 */
module.exports = function (cwd) {
  /**
   * @type {import('type-fest').PackageJson}
   */
  const pkgJson = JSON.parse(
    fs.readFileSync(path.join(cwd, 'package.json'), 'utf-8'),
  );
  const {exports} = pkgJson;
  if (!exports) {
    throw new TypeError('package.json does not have exports');
  }
  if (typeof exports !== 'object') {
    throw new TypeError('package.json exports is not an object');
  }

  return {
    entryPoints: Object.values(exports)
      .filter(
        (entryPoint) =>
          entryPoint &&
          typeof entryPoint === 'object' &&
          'typedoc' in entryPoint &&
          typeof entryPoint.typedoc === 'string',
      )
      .map((entryPoint) =>
        path.join(
          cwd,
          /**
           * @type {{typedoc: string}}
           */ (entryPoint).typedoc,
        ),
      ),
    excludeInternal: true,
    excludePrivate: true,
  };
};
