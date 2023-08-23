import {glob} from 'glob';
import isESMFile from 'is-file-esm';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {PackageJson} from 'read-pkg';
import {z} from 'zod';
import {castArray} from '../../util';
import {CheckFailure} from '../result';
import {createRule} from '../rule';

const EXPORTS_FIELD = 'exports';
const CONDITIONAL_EXPORT_DEFAULT = 'default';
const CONDITIONAL_EXPORT_REQUIRE = 'require';
const CONDITIONAL_EXPORT_IMPORT = 'import';
const CONDITIONAL_EXPORT_TYPES = 'types';

function isESMPkg(pkgJson: PackageJson) {
  return 'type' in pkgJson && pkgJson.type === 'module';
}

const noMissingExports = createRule({
  async check({pkgJson, pkgPath, fail}, opts) {
    opts = {
      glob: true,
      require: true,
      import: true,
      types: true,
      order: true,
      ...opts,
    };

    if (!pkgJson[EXPORTS_FIELD]) {
      if (isESMPkg(pkgJson)) {
        return [
          fail(`No "exports" field found for ESM package "${pkgJson.name}"`),
        ];
      }
      return;
    }

    /**
     * @param relativePath Path from package root to file
     * @param baseExportName Export name, if `exports` is an object
     * @param displayExportName Optional; refers to key in an object field (e.g., `bin` as an object instead of `string`)
     */
    const checkFile = async (
      relativePath: string | null,
      baseExportName?: string,
      displayExportName = baseExportName,
    ): Promise<CheckFailure | undefined> => {
      // this just means "do not export this"
      if (relativePath === null) {
        return;
      }

      // seems wrong to have an empty string for a path!
      if (!relativePath) {
        return fail(
          displayExportName
            ? `Export "${displayExportName}" contains an empty path`
            : 'Export contains empty path',
        );
      }

      // use glob only if there's a glob pattern.  premature optimization?
      if (glob.hasMagic(relativePath, {magicalBraces: true})) {
        if (opts?.glob === false) {
          return fail(
            displayExportName
              ? `Export "${displayExportName}" contains a glob pattern`
              : 'Export contains a glob pattern',
          );
        }
        const globSpec = relativePath;
        const matchingFiles = await glob(globSpec, {
          cwd: pkgPath,
        });

        // it's _possible_, but unlikely that we'd have an unreadable file,
        // so don't bother statting or checking readability
        if (!matchingFiles.length) {
          return fail(
            displayExportName
              ? `Export "${displayExportName}" matches no files using glob: ${globSpec}`
              : `Export matches no files using glob: ${globSpec}`,
          );
        }
        return;
      }

      const filepath = path.resolve(pkgPath, relativePath);

      try {
        await fs.stat(filepath);
      } catch {
        return fail(
          baseExportName
            ? `Export "${displayExportName}" unreadable at path: ${relativePath}`
            : `Export unreadable at path: ${relativePath}`,
        );
      }

      if (
        baseExportName === CONDITIONAL_EXPORT_IMPORT &&
        opts?.import &&
        !(await isESMFile(filepath)).esm
      ) {
        return fail(
          baseExportName
            ? `Expected export "${displayExportName}" to be an ESM module at path: ${relativePath}`
            : `Expected export to be an ESM module at path: ${relativePath}`,
        );
      } else if (
        baseExportName === CONDITIONAL_EXPORT_REQUIRE &&
        opts?.require &&
        (await isESMFile(filepath)).esm
      ) {
        return fail(
          baseExportName
            ? `Expected export "${displayExportName}" to be a CJS script at path: ${relativePath}`
            : `Expected export to be a CJS script at path: ${relativePath}`,
        );
      } else if (
        baseExportName === CONDITIONAL_EXPORT_TYPES &&
        opts?.types &&
        !path.extname(relativePath).endsWith('.d.ts')
      ) {
        return fail(
          baseExportName
            ? `Expected export "${displayExportName}" to be a .d.ts file at path: ${relativePath}`
            : `Expected export to be a .d.ts file at path: ${relativePath}`,
        );
      }
    };

    /**
     * If `exports` is conditional and contains a `default` key, return a
     * `RuleFailure` if the `default` key is _not_ the last key in the object
     * @param exports Conditional or subpath exports
     */
    const checkOrder = (exports: Record<string, string | null>) => {
      if (opts?.order && CONDITIONAL_EXPORT_DEFAULT in exports) {
        const keys = Object.keys(exports);
        if (keys[keys.length - 1] !== CONDITIONAL_EXPORT_DEFAULT) {
          return [
            fail(
              `Conditional export "${CONDITIONAL_EXPORT_DEFAULT}" must be the last export`,
            ),
          ];
        }
      }
    };

    const exports = pkgJson[EXPORTS_FIELD] as
      | string
      | null
      | Record<string, string | null>;

    if (exports === null) {
      return [fail(`"${EXPORTS_FIELD}" field canot be null`)];
    }

    // yeah yeah
    let result:
      | (CheckFailure | undefined | (CheckFailure | undefined)[])[]
      | CheckFailure
      | undefined;

    if (typeof exports === 'string') {
      result = await checkFile(exports);
    } else {
      result =
        checkOrder(exports) ??
        (await Promise.all(
          Object.entries(exports).map(([name, relativePath]) => {
            // most certainly an object
            if (relativePath && typeof relativePath === 'object') {
              return (
                checkOrder(relativePath) ??
                Promise.all(
                  Object.entries(relativePath).map(
                    ([deepName, relativePath]) => {
                      // don't think this can be an object, but might be wrong!
                      return checkFile(
                        relativePath as string | null,
                        deepName,
                        `${name} » ${deepName}`,
                      );
                    },
                  ),
                )
              );
            }

            // string or null
            return checkFile(relativePath, name);
          }),
        ));
    }

    return castArray(result).flat().filter(Boolean) as CheckFailure[];
  },
  name: 'no-missing-exports',
  description: `Checks that all files in the "${EXPORTS_FIELD}" field (if present) exist`,
  schema: z.object({
    types: z
      .boolean()
      .default(true)
      .optional()
      .describe(
        `Assert a "${CONDITIONAL_EXPORT_TYPES}" conditional export matches a file with a .d.ts extension`,
      ),
    require: z
      .boolean()
      .default(true)
      .optional()
      .describe(
        `Assert a "${CONDITIONAL_EXPORT_REQUIRE}" conditional export matches a CJS script`,
      ),
    import: z
      .boolean()
      .default(true)
      .optional()
      .describe(
        `Assert an "${CONDITIONAL_EXPORT_IMPORT}" conditional export matches a ESM module`,
      ),
    order: z
      .boolean()
      .default(true)
      .optional()
      .describe(
        `Assert conditional export "${CONDITIONAL_EXPORT_DEFAULT}", if present, is the last export`,
      ),
    glob: z
      .boolean()
      .default(true)
      .optional()
      .describe('Allow glob patterns in subpath exports'),
  }),
});

export default noMissingExports;
