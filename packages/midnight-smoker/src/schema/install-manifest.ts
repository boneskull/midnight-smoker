import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

import {WorkspaceInfoSchema} from './workspace-info';

/**
 * The `pack` implementation of a `PkgManager` should return this value.
 */
export const InstallManifestSchema = WorkspaceInfoSchema.partial({
  localPath: true,
  pkgJson: true,
  pkgJsonPath: true,
  rawPkgJson: true,
})
  .extend({
    cwd: NonEmptyStringSchema.describe('The working directory for the install'),
    installPath: NonEmptyStringSchema.optional().describe(
      'The path to install the package to; only applicable if spec is a tarball',
    ),
    isAdditional: z
      .boolean()
      .optional()
      .describe(
        'True if this manifest was from an extra dep specified by --add',
      ),
    localPath: NonEmptyStringSchema.optional(),
    pkgSpec: NonEmptyStringSchema.describe(
      'The package spec to install; either a tarball or a name[@version] for additional deps',
    ),
  })
  .readonly()
  .describe('Installation manifest (what to install and where)');
