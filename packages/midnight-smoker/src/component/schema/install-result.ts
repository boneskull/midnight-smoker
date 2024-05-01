import {ExecResultSchema} from '#schema/exec-result';
import {InstallManifestSchema} from '#schema/install-manifest';
import {z} from 'zod';

export const InstallResultSchema = z.object({
  installManifest: InstallManifestSchema,
  rawResult: ExecResultSchema,
});

export type InstallResult = z.infer<typeof InstallResultSchema>;
