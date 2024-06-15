import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';
import {WorkspaceInfoSchema} from './workspace-info';

export const InstallManifestSchema = WorkspaceInfoSchema.partial()
  .extend({
    cwd: NonEmptyStringSchema.describe('The working directory for the install'),
    installPath: NonEmptyStringSchema.optional().describe(
      'The path to install the package to; only applicable if spec is a tarball',
    ),
    pkgSpec: NonEmptyStringSchema.describe(
      'The package spec to install; either a tarball or a name[@version] for additional deps',
    ),
    isAdditional: z
      .boolean()
      .optional()
      .describe(
        'True if this manifest was from an extra dep specified by --add',
      ),
  })
  .describe('Installation manifest (what to install and where)');

export type InstallManifest = z.infer<typeof InstallManifestSchema>;
