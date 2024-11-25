import {
  type InstallManifest,
  type WorkspaceInstallManifest,
} from '#defs/pkg-manager';
import {NonEmptyStringSchema} from '#schema/util/util';
import {BaseWorkspaceInfoSchema} from '#schema/workspace-info';
import {z} from 'zod';

const BaseWorkspaceInstallManifestSchema = BaseWorkspaceInfoSchema.extend({
  cwd: NonEmptyStringSchema.describe('The working directory for the install'),
  installPath: NonEmptyStringSchema.describe(
    'The path to install the package to; only applicable if spec is a tarball',
  ),
  isAdditional: z
    .literal(false)
    .describe('True if this manifest was from an extra dep specified by --add')
    .optional(),
  localPath: NonEmptyStringSchema,
  pkgSpec: NonEmptyStringSchema.describe(
    'The package spec to install; either a tarball or a name[@version] for additional deps',
  ),
}).describe('Installation manifest (what to install and where)');

/**
 * The `pack` implementation of a `PkgManager` should return this value.
 */
export const WorkspaceInstallManifestSchema: z.ZodType<WorkspaceInstallManifest> =
  BaseWorkspaceInstallManifestSchema.readonly();

export const InstallManifestSchema: z.ZodType<InstallManifest> =
  BaseWorkspaceInstallManifestSchema.partial({
    installPath: true,
    isAdditional: true,
    localPath: true,
    pkgJson: true,
    pkgJsonPath: true,
    pkgJsonSource: true,
  }).readonly();
