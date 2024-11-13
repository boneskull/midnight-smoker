// @ts-check

const path = require('node:path');

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
  const pkgJson = require(path.join(cwd, 'package.json'));

  const {exports} = pkgJson;
  if (!exports || typeof exports !== 'object') {
    // should make typedoc barf
    return {};
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
    excludeExternals: true,
  };
};
