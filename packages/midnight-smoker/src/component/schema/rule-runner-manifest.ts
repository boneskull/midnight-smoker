import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

export type RunRuleManifest = z.infer<typeof RunRuleManifestSchema>;
export type RunRulesManifest = z.infer<typeof RunRulesManifestSchema>;

export const RunRuleManifestSchema = z.object({
  pkgName: NonEmptyStringSchema.describe('Name of package being checked'),
  installPath: NonEmptyStringSchema.describe(
    'Install path of package being checked',
  ),
});
export const RunRulesManifestSchema = z
  .array(RunRuleManifestSchema)
  .describe('Installation paths to check');
