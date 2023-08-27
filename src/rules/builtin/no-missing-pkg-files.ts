import createDebug from 'debug';
import fs from 'node:fs/promises';
import path from 'node:path';
import {z} from 'zod';
import {CheckFailure} from '../result';
import {createRule} from '../rule';
import {zNonEmptyStringArray, zTrue} from '../../schema-util';

const debug = createDebug('midnight-smoker:rule:no-missing-pkg-files');

const noMissingPkgFiles = createRule({
  async check({pkgJson: pkg, pkgPath, fail}, opts) {
    let fieldsToCheck = opts.fields ?? [];
    if (opts.bin !== false) {
      fieldsToCheck.push('bin');
    }
    if (opts.browser !== false) {
      fieldsToCheck.push('browser');
    }
    if (opts.types !== false) {
      fieldsToCheck.push('types');
    }
    fieldsToCheck = [...new Set(fieldsToCheck)];

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

    const res = await Promise.all(
      fieldsToCheck
        .filter((field) => field in pkg)
        .map(async (field) => {
          const value = pkg[field];
          if (value) {
            if (typeof value === 'string') {
              return checkFile(value, field);
            }
            if (!Array.isArray(value) && typeof value === 'object') {
              return Promise.all(
                Object.entries(value).map(([name, relativePath]) =>
                  checkFile(relativePath, field, name),
                ),
              );
            }
          }
        }),
    );

    return res.flat().filter(Boolean) as CheckFailure[];
  },
  name: 'no-missing-pkg-files',
  description:
    'Checks that files referenced in package.json exist in the tarball',
  schema: z.object({
    bin: zTrue.describe('Check the "bin" field (if it exists)'),
    browser: zTrue.describe('Check the "browser" field (if it exists)'),
    types: zTrue.describe('Check the "types" field (if it exists)'),
    fields: zNonEmptyStringArray.describe(
      'Check files referenced by these additional top-level fields',
    ),
  }),
});

export default noMissingPkgFiles;
