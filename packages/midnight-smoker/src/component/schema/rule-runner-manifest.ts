import {NonEmptyStringSchema} from '#util/schema-util.js';
import {z} from 'zod';

export const RunRulesManifestSchema = z
  .array(
    z.object({
      pkgName: NonEmptyStringSchema.describe('Name of package being checked'),
      installPath: NonEmptyStringSchema.describe(
        'Install path of package being checked',
      ),
    }),
  )
  .describe('Installation paths to check');

export type RunRulesManifest = z.infer<typeof RunRulesManifestSchema>;
