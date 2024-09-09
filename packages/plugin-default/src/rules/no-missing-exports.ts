import type {PluginAPI} from 'midnight-smoker/plugin';

import {createDebug} from '../debug';
import {
  CONDITIONAL_EXPORT_DEFAULT,
  CONDITIONAL_EXPORT_IMPORT,
  CONDITIONAL_EXPORT_REQUIRE,
  CONDITIONAL_EXPORT_TYPES,
  EXPORTS_FIELD,
  ExportsInspector,
} from './exports-inspector';

const debug = createDebug(__filename);

export default function noMissingExports({
  defineRule,
  SchemaUtils: schemaUtils,
  z,
}: PluginAPI) {
  defineRule({
    async check(ctx, opts) {
      debug('Checking exports in %s using opts %O', ctx.pkgJsonPath, opts);

      const inspector = new ExportsInspector(ctx, opts);

      await inspector.inspect();
    },
    description: `Checks that all files in the "${EXPORTS_FIELD}" field (if present) exist`,
    name: 'no-missing-exports',
    schema: z.object({
      glob: schemaUtils.DefaultTrueSchema.describe(
        'Allow glob patterns in subpath exports',
      ),
      import: schemaUtils.DefaultTrueSchema.describe(
        `Assert an "${CONDITIONAL_EXPORT_IMPORT}" conditional export matches a ESM module`,
      ),
      order: schemaUtils.DefaultTrueSchema.describe(
        `Assert conditional export "${CONDITIONAL_EXPORT_DEFAULT}", if present, is the last export`,
      ),
      require: schemaUtils.DefaultTrueSchema.describe(
        `Assert a "${CONDITIONAL_EXPORT_REQUIRE}" conditional export matches a CJS script`,
      ),
      types: schemaUtils.DefaultTrueSchema.describe(
        `Assert a "${CONDITIONAL_EXPORT_TYPES}" conditional export matches a file with a .d.ts extension`,
      ),
    }),
    url: 'https://boneskull.github.io/midnight-smoker/rules/no-missing-exports',
  });
}
