import {type InstallManifest} from '#defs/pkg-manager';
import {ExecOutputSchema} from '#schema/exec/exec-output';
import {InstallManifestSchema} from '#schema/pkg-manager/install-manifest';
import {z} from 'zod';

import {type ExecOutput} from '../exec/exec-output';

/**
 * The object fulfilled by `PkgManager.install`
 */
export const InstallResultSchema: z.ZodType<InstallResult> = z
  .object({
    installManifest: InstallManifestSchema.describe(
      'Original install manifest',
    ),
    rawResult: ExecOutputSchema.describe('Raw result of the install command'),
  })
  .readonly();

/**
 * {@inheritDoc InstallResultSchema}
 */
export type InstallResult = Readonly<{
  installManifest: InstallManifest;
  rawResult: ExecOutput;
}>;
