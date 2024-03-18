import {InstallManifestSchema} from '#schema/install-manifest';
import {StaticPkgManagerSpecSchema} from '#schema/static-pkg-manager-spec';
import {z} from 'zod';

export const PkgManagerInstallManifestSchema = z.object({
  spec: StaticPkgManagerSpecSchema,
  installManifests: z.array(
    InstallManifestSchema.extend({
      isAdditional: z
        .boolean()
        .optional()
        .describe(
          'True if this manifest was from an extra dep specified by --add',
        ),
    }),
  ),
});

export type PkgManagerInstallManifest = z.infer<
  typeof PkgManagerInstallManifestSchema
>;
