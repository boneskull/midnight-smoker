import Debug from 'debug';
import type {PluginAPI} from 'midnight-smoker/plugin';
import fs from 'node:fs/promises';
import path from 'node:path';

const debug = Debug(
  'midnight-smoker:plugin-default:rule:no-missing-entry-point',
);

const DEFAULT_FIELD = 'main';

/**
 * Default entry points for CJS packages which do not contain a `main` field.
 *
 * Order matters.
 *
 * @see {@link https://nodejs.org/api/modules.html#all-together}
 */
const DEFAULT_ENTRY_POINTS = ['index.js', 'index.json', 'index.node'] as const;

export default function noMissingEntryPoint({defineRule}: PluginAPI) {
  defineRule({
    async check({pkgJson, pkgPath, addIssue}) {
      // skip if the package has an "exports" field or it's an ESM package
      if (
        'exports' in pkgJson ||
        ('type' in pkgJson && pkgJson.type === 'module')
      ) {
        return;
      }

      // I don't think this should ever be anything other than `main`; change later if needed
      const field = DEFAULT_FIELD;

      if (pkgJson[field]) {
        // the field exists, so check the file exists
        const relativePath = pkgJson[field];
        const filepath = path.resolve(pkgPath, relativePath);
        try {
          await fs.stat(filepath);
        } catch {
          addIssue(
            `No entry point found for package "${pkgJson.name}"; file from field "${field}" unreadable at path: ${relativePath}`,
          );
        }
      } else {
        // the field doesn't exist, so look at the default entry points in order of precedence
        let found = false;
        const queue = [...DEFAULT_ENTRY_POINTS];
        while (queue.length && !found) {
          const relativePath = queue.shift()!; // in order!!!
          const filepath = path.resolve(pkgPath, relativePath);
          debug('Checking default entry point %s', filepath);
          try {
            await fs.stat(filepath);
            found = true;
          } catch {}
        }
        if (!found) {
          addIssue(
            `No entry point found for package "${pkgJson.name}"; (index.js, index.json or index.node)`,
          );
        }
      }
    },
    name: 'no-missing-entry-point',
    url: 'https://boneskull.github.io/midnight-smoker/rules/no-missing-entry-point',
    description:
      'Checks that the package contains an entry point; only applies to CJS packages without an "exports" field',
  });
}
