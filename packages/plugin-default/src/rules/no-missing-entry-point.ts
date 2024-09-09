import {PACKAGE_JSON, type PluginAPI} from 'midnight-smoker';
import fs from 'node:fs/promises';
import path from 'node:path';

import {createDebug} from '../debug';

const debug = createDebug(__filename);

const DEFAULT_FIELD = 'main';

/**
 * Default entry points for CJS packages which do not contain a `main` field.
 *
 * Order matters.
 *
 * @see {@link https://nodejs.org/api/modules.html#all-together}
 */
const DEFAULT_ENTRY_POINTS = ['index.js', 'index.json', 'index.node'] as const;

export default function noMissingEntryPoint({defineRule, z}: PluginAPI) {
  defineRule({
    async check({addIssue, installPath, pkgJson, pkgName}, {ignoreIfESM}) {
      // skip if the package is type=module
      if (!ignoreIfESM && pkgJson.type === 'module') {
        return;
      }

      // I don't think this should ever be anything other than `main`; change later if needed
      const field = DEFAULT_FIELD;

      if (pkgJson[field]) {
        // the field exists, so check the file exists
        const relativePath = pkgJson[field];
        const filepath = path.resolve(installPath, relativePath);
        try {
          await fs.access(filepath, fs.constants.R_OK);
        } catch {
          addIssue(
            `File from field "${field}" unreadable at path: ${relativePath}`,
            {filepath: PACKAGE_JSON, jsonField: field},
          );
        }
      } else {
        // the field doesn't exist, so look at the default entry points in order of precedence
        let found = false;
        const queue = [...DEFAULT_ENTRY_POINTS];
        while (queue.length && !found) {
          const relativePath = queue.shift()!; // in order!!!
          const filepath = path.resolve(installPath, relativePath);
          debug('Checking default entry point %s', filepath);
          try {
            await fs.stat(filepath);
            found = true;
          } catch {
            // ignored
          }
        }
        if (!found) {
          addIssue(
            `No entry point found for package "${pkgName}"; (index.js, index.json or index.node)`,
          );
        }
      }
    },
    description:
      'Checks that the package contains an entry point; only applies to CJS packages without an "exports" field',
    name: 'no-missing-entry-point',
    schema: z.object({
      ignoreIfESM: z
        .boolean()
        .default(false)
        .describe('If true, ignore ESM packages ("type": "module")'),
    }),
    url: 'https://boneskull.github.io/midnight-smoker/rules/no-missing-entry-point',
  });
}
