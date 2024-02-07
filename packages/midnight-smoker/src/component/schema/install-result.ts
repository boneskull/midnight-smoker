import {z} from 'zod';
import {ExecResultSchema} from './exec-result';
import {PkgManagerInstallManifestSchema} from './install-manifest';

export const InstallResultSchema = z.object({
  installManifests: z.array(PkgManagerInstallManifestSchema),
  rawResult: ExecResultSchema,
});
export type InstallResult = z.infer<typeof InstallResultSchema>;
