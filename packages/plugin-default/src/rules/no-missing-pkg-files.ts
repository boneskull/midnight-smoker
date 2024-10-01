import type {PluginAPI} from 'midnight-smoker/plugin';

import fs from 'node:fs/promises';
import path from 'node:path';

import {createDebug} from '../debug';

const debug = createDebug(__filename);

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
  SchemaUtils: schemaUtils,
  z,
}: PluginAPI) {
  const {DefaultTrueSchema, NonEmptyStringToArraySchema} = schemaUtils;

  defineRule({
    async check({addIssue, installPath, pkgJson}, opts) {
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
        const filepath = path.resolve(installPath, relativePath);
        debug('Checking for %s (from field "%s")', filepath, field);
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
         * Present if the field is an object (e.g., `bin` as an object instead
         * of `string`); the object key
         */
        name?: string;

        /**
         * Assumed to be a relative path
         */
        relativePath: string;
      }

      /**
       * Assuming a relative filepath is the value of a field in `package.json`
       * _or_ the value is a `Record<string, string>` (e.g., `bin`), return an
       * array of {@link PkgFilepathInfo} objects to check for existence.
       *
       * @param currentInfo - List of {@link PkgFilepathInfo} objects to append
       *   to
       * @param field - Fieldname
       * @returns New array with any new objects appended
       */
      const filenameReducer = (
        currentInfo: Readonly<PkgFilepathInfo[]>,
        field: string,
      ): Readonly<PkgFilepathInfo[]> => {
        let newInfo = [...currentInfo];
        if (field in pkgJson) {
          const relativePath: unknown = pkgJson[field];
          if (relativePath) {
            if (typeof relativePath === 'string') {
              newInfo = [...newInfo, {field, relativePath}];
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
                    field,
                    name,
                    relativePath: relativePath as string,
                  })),
              ];
            }
          }
        }
        return newInfo;
      };

      /**
       * Array of {@link CheckFailure} or `undefined` (if the file exists)
       */
      await Promise.all(
        fields
          .reduce<ReturnType<typeof filenameReducer>>(filenameReducer, [])
          .map(({field, name, relativePath}) =>
            checkFile(relativePath, field, name),
          ),
      );
    },
    description:
      'Checks that files referenced in package.json exist in the tarball',
    name: 'no-missing-pkg-files',
    schema: z.object({
      bin: DefaultTrueSchema.describe('Check the "bin" field (if it exists)'),
      browser: DefaultTrueSchema.describe(
        'Check the "browser" field (if it exists)',
      ),
      fields: NonEmptyStringToArraySchema.describe(
        'Check files referenced by these additional top-level fields',
      ),
      module: DefaultTrueSchema.describe(
        'Check the "module" field (if it exists)',
      ),
      types: DefaultTrueSchema.describe(
        'Check the "types" field (if it exists)',
      ),
      unpkg: DefaultTrueSchema.describe(
        'Check the "unpkg" field (if it exists)',
      ),
    }),
    url: 'https://boneskull.github.io/midnight-smoker/rules/no-missing-pkg-files',
  });
}
