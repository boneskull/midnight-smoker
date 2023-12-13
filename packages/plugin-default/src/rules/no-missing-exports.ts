import Debug from 'debug';
import type {PluginAPI} from 'midnight-smoker/plugin';
import {
  CONDITIONAL_EXPORT_DEFAULT,
  CONDITIONAL_EXPORT_IMPORT,
  CONDITIONAL_EXPORT_REQUIRE,
  CONDITIONAL_EXPORT_TYPES,
  EXPORTS_FIELD,
  ExportsInspector,
} from './exports-inspector';

export const debug = Debug('midnight-smoker:plugin-default:no-missing-exports');

export default function noMissingExports({
  defineRule,
  z,
  SchemaUtils: schemaUtils,
}: PluginAPI) {
  defineRule({
    async check(ctx, opts) {
      debug('Checking exports in %s using opts %O', ctx.pkgJsonPath, opts);

      const inspector = new ExportsInspector(ctx, opts);

      await inspector.inspect();
    },
    name: 'no-missing-exports',
    url: 'https://boneskull.github.io/midnight-smoker/rules/no-missing-exports',
    description: `Checks that all files in the "${EXPORTS_FIELD}" field (if present) exist`,
    schema: z.object({
      types: schemaUtils.zDefaultTrue.describe(
        `Assert a "${CONDITIONAL_EXPORT_TYPES}" conditional export matches a file with a .d.ts extension`,
      ),
      require: schemaUtils.zDefaultTrue.describe(
        `Assert a "${CONDITIONAL_EXPORT_REQUIRE}" conditional export matches a CJS script`,
      ),
      import: schemaUtils.zDefaultTrue.describe(
        `Assert an "${CONDITIONAL_EXPORT_IMPORT}" conditional export matches a ESM module`,
      ),
      order: schemaUtils.zDefaultTrue.describe(
        `Assert conditional export "${CONDITIONAL_EXPORT_DEFAULT}", if present, is the last export`,
      ),
      glob: schemaUtils.zDefaultTrue.describe(
        'Allow glob patterns in subpath exports',
      ),
    }),
  });
}
