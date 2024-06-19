import {WorkspaceInfoSchema} from '#schema/workspace-info';
import {NonEmptyStringSchema, PackageJsonSchema} from '#util/schema-util';
import {z} from 'zod';

export const LintManifestSchema = z.object({
  pkgName: NonEmptyStringSchema,
  pkgJson: PackageJsonSchema,
  pkgJsonPath: NonEmptyStringSchema,
  installPath: NonEmptyStringSchema,
  workspace: WorkspaceInfoSchema,
});

export type LintManifest = z.infer<typeof LintManifestSchema>;
