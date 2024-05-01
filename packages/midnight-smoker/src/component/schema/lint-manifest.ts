import {WorkspaceInfoSchema} from '#schema/workspaces';
import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

export type LintManifest = z.infer<typeof LintManifestSchema>;

export type LintManifests = z.infer<typeof LintManifestsSchema>;

export const LintManifestSchema = WorkspaceInfoSchema.extend({
  installPath: NonEmptyStringSchema.describe(
    'Install path of package being checked',
  ),
});

export const LintManifestsSchema = z
  .array(LintManifestSchema)
  .describe('Installation paths to check');
