import createDebug from 'debug';
import fs from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {CheckFailure} from '../result';
import {createRule} from '../rule';
import {zNonEmptyStringArray, zTrue} from '../../schema-util';

const debug = createDebug('midnight-smoker:rule:no-missing-pkg-files');

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

const noMissingPkgFiles = createRule({
  async check({pkgJson, pkgPath, fail}, opts) {
    let fields = opts.fields ?? [];

    // add any explicit fields to the list of fields to check.
    // these are kept separate so someone doesn't overwrite them by providing `fields`
    for (const field of EXPLICIT_FIELD_FLAGS) {
      if (opts[field] !== false) {
        fields.push(field);
      }
    }

    fields = [...new Set(fields)]; // unique

    debug(`Checking fields: %O`, fields);

    /**
     * @param relativePath Path from package root to file
     * @param field Field name
     * @param name Optional; refers to key in an object field (e.g., `bin` as an object instead of `string`)
     * @todo maybe make this a utility function?
     */
    const checkFile = async (
      relativePath: string,
      field: string,
      name?: string,
    ): Promise<CheckFailure | undefined> => {
      const filepath = path.resolve(pkgPath, relativePath);
      debug('Checking for %s from field %s', filepath, field);
      try {
        await fs.stat(filepath);
      } catch {
        return fail(
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
       * Present if the field is an object (e.g., `bin` as an object instead of `string`); the object key
       */
      name?: string;
    }

    /**
     * Assuming a relative filepath is the value of a field in `package.json` _or_ the value
     * is a `Record<string, string>` (e.g., `bin`), return an array of {@linkcode PkgFilepathInfo} objects to check for existence.
     * @param currentInfo - List of {@linkcode PkgFilepathInfo} objects to append to
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
                .filter(([, relativePath]) => typeof relativePath === 'string')
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
    const res = await Promise.all(
      fields
        .reduce(filenameReducer, [] as PkgFilepathInfo[])
        .map(({relativePath, field, name}) =>
          checkFile(relativePath, field, name),
        ),
    );

    return res.filter(Boolean) as CheckFailure[];
  },
  name: 'no-missing-pkg-files',
  description:
    'Checks that files referenced in package.json exist in the tarball',
  schema: z.object({
    bin: zTrue.describe('Check the "bin" field (if it exists)'),
    browser: zTrue.describe('Check the "browser" field (if it exists)'),
    types: zTrue.describe('Check the "types" field (if it exists)'),
    unpkg: zTrue.describe('Check the "unpkg" field (if it exists)'),
    module: zTrue.describe('Check the "module" field (if it exists)'),
    fields: zNonEmptyStringArray.describe(
      'Check files referenced by these additional top-level fields',
    ),
  }),
});

export default noMissingPkgFiles;
