import {InstallManifestSchema} from '#schema/install-manifest';
import {PkgManagerDefSchema} from '#schema/pkg-manager-def';
import {z} from 'zod';

export const PkgManagerInstallManifestSchema = InstallManifestSchema.extend({
  isAdditional: z
    .boolean()
    .optional()
    .describe('True if this manifest was from an extra dep specified by --add'),
  pkgManager: PkgManagerDefSchema,
}).describe(
  'Tells a PackageManager what package to install where from which tarball',
);

export type PkgManagerInstallManifest = z.infer<
  typeof PkgManagerInstallManifestSchema
>;
