import {z} from 'zod';
import {ExecResultSchema} from '#schema/exec-result';
import { InstallManifestsSchema } from '#schema/install-manifest';

export const InstallResultSchema = z.object({
  installManifests: InstallManifestsSchema,
  rawResult: ExecResultSchema,
});
export type InstallResult = z.infer<typeof InstallResultSchema>;
