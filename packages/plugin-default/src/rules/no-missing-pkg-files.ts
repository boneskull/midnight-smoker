import Debug from 'debug';
import {PluginAPI} from 'midnight-smoker/plugin';
import fs from 'node:fs/promises';
import path from 'node:path';

const debug = Debug('midnight-smoker:rule:no-missing-pkg-files');

/**
 * Each of these is a flag in the options object, which can be set to `false` to
 * avoid checking the value (relative filepath) exists.
 */
const EXPLICIT_FIELD_FLAGS = [
  'bin',
  'browser',
  'types',
  'unpkg',
  'module',
] as const;

export default function noMissingPkgFiles({
  defineRule,
  z,
  SchemaUtils: schemaUtils,
}: PluginAPI) {
  const {zDefaultTrue, zNonEmptyStringOrArrayThereof} = schemaUtils;
  defineRule({
    async check({pkgJson, pkgPath, addIssue}, opts) {
      let {fields} = opts;

      // add any explicit fields to the list of fields to check.
      // these are kept separate so someone doesn't overwrite them by providing `fields`
      fields = [
        ...new Set([
          ...fields,
          ...EXPLICIT_FIELD_FLAGS.filter((field) => opts[field]),
        ]),
      ]; // unique

      debug(`Checking fields: %O`, fields);

      /**
       * @param relativePath Path from package root to file
       * @param field Field name
       * @param name Optional; refers to key in an object field (e.g., `bin` as
       *   an object instead of `string`)
       * @todo Maybe make this a utility function?
       */
      const checkFile = async (
        relativePath: string,
        field: string,
        name?: string,
      ): Promise<void> => {
        const filepath = path.resolve(pkgPath, relativePath);
        debug('Checking for %s from field %s', filepath, field);
        try {
          await fs.stat(filepath);
        } catch {
          addIssue(
            name
              ? `File "${name}" from "${field}" field unreadable at path: ${relativePath}`
              : `File from "${field}" field unreadable at path: ${relativePath}`,
          );
        }
      };

      interface PkgFilepathInfo {
        /**
         * Fieldname in `package.json`
         */
        field: string;
        /**
         * Assumed to be a relative path
         */
        relativePath: string;
        /**
         * Present if the field is an object (e.g., `bin` as an object instead
         * of `string`); the object key
         */
        name?: string;
      }

      /**
       * Assuming a relative filepath is the value of a field in `package.json`
       * _or_ the value is a `Record<string, string>` (e.g., `bin`), return an
       * array of {@linkcode PkgFilepathInfo} objects to check for existence.
       *
       * @param currentInfo - List of {@linkcode PkgFilepathInfo} objects to
       *   append to
       * @param field - Fieldname
       * @returns New array with any new objects appended
       */
      const filenameReducer = (
        currentInfo: Readonly<PkgFilepathInfo[]>,
        field: string,
      ): Readonly<PkgFilepathInfo[]> => {
        let newInfo = [...currentInfo];
        if (field in pkgJson) {
          const relativePath = pkgJson[field];
          if (relativePath) {
            if (typeof relativePath === 'string') {
              newInfo = [...newInfo, {relativePath, field}];
            } else if (
              !Array.isArray(relativePath) &&
              typeof relativePath === 'object'
            ) {
              newInfo = [
                ...newInfo,
                ...Object.entries(relativePath)
                  .filter(
                    ([, relativePath]) => typeof relativePath === 'string',
                  )
                  .map(([name, relativePath]) => ({
                    relativePath: relativePath as string,
                    field,
                    name,
                  })),
              ];
            }
          }
        }
        return newInfo;
      };

      /**
       * Array of {@linkcode CheckFailure} or `undefined` (if the file exists)
       */
      await Promise.all(
        fields
          .reduce<ReturnType<typeof filenameReducer>>(filenameReducer, [])
          .map(({relativePath, field, name}) =>
            checkFile(relativePath, field, name),
          ),
      );
    },
    name: 'no-missing-pkg-files',
    url: 'https://boneskull.github.io/midnight-smoker/rules/no-missing-pkg-files',
    description:
      'Checks that files referenced in package.json exist in the tarball',
    schema: z.object({
      bin: zDefaultTrue.describe('Check the "bin" field (if it exists)'),
      browser: zDefaultTrue.describe(
        'Check the "browser" field (if it exists)',
      ),
      types: zDefaultTrue.describe('Check the "types" field (if it exists)'),
      unpkg: zDefaultTrue.describe('Check the "unpkg" field (if it exists)'),
      module: zDefaultTrue.describe('Check the "module" field (if it exists)'),
      fields: zNonEmptyStringOrArrayThereof.describe(
        'Check files referenced by these additional top-level fields',
      ),
    }),
  });
}
