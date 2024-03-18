import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';
import {InstallManifestSchema} from './install-manifest';

export const PkgInstallManifest = InstallManifestSchema.extend({
  isAdditional: z.literal(false).optional(),
  installPath: NonEmptyStringSchema,
});

export type PkgInstallManifest = z.infer<typeof PkgInstallManifest>;
