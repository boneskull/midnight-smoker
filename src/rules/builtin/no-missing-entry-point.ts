import fs from 'node:fs/promises';
import path from 'node:path';
import {createRule} from '../rule';
import {z} from 'zod';

const DEFAULT_FIELD = 'main';

/**
 * Default entry points for CJS packages which do not contain a `main` field.
 *
 * Order matters.
 * @see {@link https://nodejs.org/api/modules.html#all-together}
 */
const DEFAULT_ENTRY_POINTS = ['index.js', 'index.json', 'index.node'] as const;

const noMissingEntryPoint = createRule({
  async check({pkgJson, pkgPath, fail}) {
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
        return [
          fail(
            `No entry point found for package "${pkgJson.name}"; file from field "${field}" unreadable at path: ${relativePath}`,
          ),
        ];
      }
    } else {
      // the field doesn't exist, so look at the default entry points in order of precedence
      let found = false;
      const queue = [...DEFAULT_ENTRY_POINTS];
      while (queue.length && !found) {
        const relativePath = queue.shift()!; // in order!!!
        const filepath = path.resolve(pkgPath, relativePath);
        try {
          await fs.stat(filepath);
          found = true;
        } catch {}
      }
      if (!found) {
        return [
          fail(
            `No entry point found for package "${pkgJson.name}"; (index.js, index.json or index.node)`,
          ),
        ];
      }
    }
  },
  schema: z.any(),
  name: 'no-missing-entry-point',
  description:
    'Checks that the package contains an entry point; only applies to CJS packages without an "exports" field',
});

export default noMissingEntryPoint;
