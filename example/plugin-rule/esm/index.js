import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * This overrides the plugin name, which would otherwise be inferred from the
 * closest ancestor `package.json`
 */
export const name = 'example';

/**
 * This overrides the plugin description, which would otherwise be inferred from
 * the closest ancestor `package.json`
 */
export const description = 'Provides a rule which validates licenses';

/**
 * Example plugin which defines the `no-unlicensed` rule.
 *
 * @type {import('midnight-smoker/plugin').PluginFactory}
 */
export const plugin = (api) => {
  api.defineRule({
    /**
     * The name of the rule; required.
     *
     * In a user's config file, it is scoped to the plugin name, so will be
     * referenced as `example/no-unlicensed`.
     */
    name: 'no-unlicensed',

    /**
     * Rule description; required.
     */
    description: 'Checks that a package has a license',

    /**
     * URL to more information about rule usage. This is optional.
     */
    url: 'https://example.com/docs/rules/no-unlicensed',

    /**
     * This rule will raise an issue if:
     *
     * - The `license` field in `package.json` is not a string
     * - The `license` field in `package.json` is empty
     * - The `licenses` field in `package.json` is not an array
     * - The `licenses` field in `package.json` is empty
     * - No known non-empty license file exists
     *
     * Enhancement suggestion: check valid SPDX license identifiers
     */
    async check({addIssue, pkgJson, installPath}, opts) {
      let validFieldFound = false;
      if ('license' in pkgJson) {
        if (typeof pkgJson.license !== 'string') {
          addIssue('Invalid `license` field in package.json');
        } else if (!pkgJson.license) {
          addIssue('Empty `license` field in package.json');
        } else {
          validFieldFound = true;
        }
      }

      // TIL this was a thing, and it's an array of `{type, url}` objects
      if ('licenses' in pkgJson) {
        if (!Array.isArray(pkgJson.licenses)) {
          addIssue('Invalid `licenses` field in package.json');
        } else if (!pkgJson.licenses.length) {
          addIssue('Empty `licenses` field in package.json');
        } else {
          validFieldFound = true;
        }
      }

      if (!validFieldFound) {
        addIssue('No `license` or `licenses` field in package.json');
      }

      // stat all of the files, looking for a non-empty one
      const nonEmptyLicenseFiles = await Promise.all(
        opts.files.map(async (file) => {
          // any file referenced in package.json is relative to installPath
          const filepath = path.resolve(installPath, file);
          try {
            const stats = await fs.stat(filepath);
            return stats.size > 0;
          } catch {
            return false;
          }
        }),
      );

      // if any were true, we're OK.
      if (!nonEmptyLicenseFiles.some(Boolean)) {
        // we can pass an arbitrary object to `addIssue` to provide extra info
        // for `verbose` mode
        addIssue('No license files found', {files: opts.files});
      }
    },

    /**
     * `midnight-smoker` uses {@link https://zod.dev Zod} to define option
     * schemas; optional.
     *
     * This provides type info to the end-user; misconfiguration will throw an
     * exception.
     */
    schema: api.z.object({
      files: api.z
        .array(api.z.string().min(1)) // array of non-empty strings
        .default(['LICENSE', 'LICENSE.md', 'LICENSE.txt'])
        .describe('Valid filenames for license files'),
    }),
  });
};
