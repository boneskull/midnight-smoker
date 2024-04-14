import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

export type LintManifest = z.infer<typeof LintManifestSchema>;
export type LintManifests = z.infer<typeof LintManifestsSchema>;

export const LintManifestSchema = z.object({
  pkgName: NonEmptyStringSchema.describe('Name of package being checked'),
  installPath: NonEmptyStringSchema.describe(
    'Install path of package being checked',
  ),
});
export const LintManifestsSchema = z
  .array(LintManifestSchema)
  .describe('Installation paths to check');
