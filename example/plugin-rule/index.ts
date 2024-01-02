import type {PluginFactory} from 'midnight-smoker/plugin';
import fs from 'node:fs/promises';

// plugin name
export const name = 'example';

export const description = 'Provides a rule which validates licenses';

export const plugin: PluginFactory = (api) => {
  api.defineRule({
    /**
     * The name of the rule. This will be unique to the plugin.
     *
     * In a user's config file, it is scoped to the plugin name, so will be
     * referenced as `example/no-unlicensed`.
     */
    name: 'no-unlicensed',

    /**
     * Rule description.
     *
     * This is required.
     */
    description: 'Checks that a package has a license',

    /**
     * This function performs the actual check. The `context` object provides
     * some extra information about the package being checked, the rule's
     * current severity, and the `addIssue` method.
     *
     * The `opts` object is the user's configuration for this rule, with your
     * defaults applied; it will be the same output type as the `schema`
     * property below.
     *
     * `addIssue()` does not exit; a rule can raise multiple issues.
     *
     * This rule will raise an issue if:
     *
     * - The `license` field in `package.json` is not a string
     * - The `license` field in `package.json` is empty
     * - The `licenses` field in `package.json` is not an array
     * - The `licenses` field in `package.json` is empty
     * - No known non-empty license file exists
     */
    async check({addIssue, pkgJson}, opts) {
      if ('license' in pkgJson) {
        if (typeof pkgJson.license !== 'string') {
          addIssue('Invalid `license` field in package.json');
        } else if (!pkgJson.license) {
          addIssue('Empty `license` field in package.json');
        } else {
          // you could validate against SPDX licenses here
        }
      }
      // TIL this was a thing, and it's an array of `{type, url}` objects
      if ('licenses' in pkgJson) {
        if (!Array.isArray(pkgJson.licenses)) {
          addIssue('Invalid `licenses` field in package.json');
        } else if (!pkgJson.licenses.length) {
          addIssue('Empty `licenses` field in package.json');
        } else {
          // you could validate against SPDX licenses here
        }
      }

      // stat all of the files, looking for a non-empty one
      const nonEmptyLicenseFiles = await Promise.all(
        opts.files.map(async (file) => {
          try {
            const stats = await fs.stat(file);
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
     * `midnight-smoker` uses Zod to define option schemas.
     *
     * Zod can be accessed via the `z` or `zod` property of the `PluginAPI`
     * object.
     *
     * Your rule may not need any options; in that case, you can omit this
     * property.
     */
    schema: api.z.object({
      files: api.z
        .array(api.z.string().min(1)) // array of non-empty strings
        .default(['LICENSE', 'LICENSE.md', 'LICENSE.txt'])
        .describe('Valid filenames for license files'),
    }),
  });
};
