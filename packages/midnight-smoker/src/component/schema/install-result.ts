import {ExecResultSchema} from '#schema/exec-result';
import {InstallManifestsSchema} from '#schema/install-manifest';
import {z} from 'zod';

export const InstallResultSchema = z.object({
  installManifests: InstallManifestsSchema,
  rawResult: ExecResultSchema,
});
export type InstallResult = z.infer<typeof InstallResultSchema>;
