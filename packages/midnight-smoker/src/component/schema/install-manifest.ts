import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

export const InstallManifestSchema = z
  .object({
    localPath: NonEmptyStringSchema.optional().describe(
      'Path to local package workspace; not applicable if this is an extra dep',
    ),
    cwd: NonEmptyStringSchema.describe('The working directory for the install'),
    installPath: NonEmptyStringSchema.optional().describe(
      'The path to install the package to; only applicable if spec is a tarball',
    ),
    pkgName: NonEmptyStringSchema.describe(
      'The name of the package to install',
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

export const InstallManifestsSchema = z.array(InstallManifestSchema);

export const AdditionalDepInstallManifestSchema = InstallManifestSchema.setKey(
  'isAdditional',
  z.literal(true),
);

export type AdditionalDepInstallManifest = z.infer<
  typeof AdditionalDepInstallManifestSchema
>;
