import {type ExecResult, ExecResultSchema} from '#schema/exec-result';
import {
  type InstallManifest,
  InstallManifestSchema,
} from '#schema/install-manifest';
import {z} from 'zod';

/**
 * The object fulfilled by `PkgManager.install`
 */
export const InstallResultSchema: z.ZodType<InstallResult> = z
  .object({
    installManifest: InstallManifestSchema.describe(
      'Original install manifest',
    ),
    rawResult: ExecResultSchema.describe('Raw result of the install command'),
  })
  .readonly();

/**
 * {@inheritDoc InstallResultSchema}
 */
export type InstallResult = Readonly<{
  installManifest: InstallManifest;
  rawResult: ExecResult;
}>;
