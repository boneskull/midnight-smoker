/**
 * Schemas and types relating to `package.json` files.
 *
 * @packageDocumentation
 */
import {PACKAGE_JSON} from '#constants';
import {
  NonEmptyNonEmptyStringArraySchema,
  NonEmptyStringSchema,
} from '#util/schema-util';
import {type Package as _NormalizedPackageJson} from 'normalize-package-data';
import {
  type PackageJson as _PackageJson,
  type Merge,
  type SetOptional,
} from 'type-fest';
import {z} from 'zod';

import {JsonValueSchema} from './json';
import {VersionStringSchema} from './version';

/**
 * A normalized `package.json` file.
 *
 * This is based on the "official" normalized `package.json` file, per
 * `normalize-package-data`, and adds additional types from `type-fest` which
 * `normalize-package-data` ignores.
 *
 * The two fields `normalize-package-data` adds, `readme` and `_id`, are unused
 * by `midnight-smoker`.
 */
export type PackageJson = SetOptional<
  Merge<_PackageJson, _NormalizedPackageJson>,
  '_id' | 'readme'
>;

export type NormalizedPackageJson = PackageJson;

/**
 * A de-normalized (a "non-normalized?") `package.json` file.
 *
 * This type reconciles the {@link _PackageJson PackageJson} type from
 * `type-fest` with {@link our normalized PackageJson}; in some cases the latter
 * claims a possible type where the former does not.
 */
export type DenormalizedPackageJson = Merge<
  _PackageJson,
  Pick<
    _PackageJson | PackageJson,
    'author' | 'bundleDependencies' | 'contributors' | 'maintainers'
  >
>;

/**
 * The value of the `type` field of a `package.json` file.
 *
 * @see {@link DenormalizedPackageJson}
 */
export type PkgJsonType = 'commonjs' | 'module';

/**
 * The value of the `workspaces` field in a `package.json` when it is an object.
 *
 * @see {@link PkgJsonWorkspaces}
 */
export type PkgJsonWorkspaceConfig = _PackageJson.WorkspaceConfig;

/**
 * The value of the `workspaces` field in a `package.json` when it is a string
 * array.
 *
 * @see {@link PkgJsonWorkspaces}
 */
export type PkgJsonWorkspacePatterns = string[];

/**
 * The value of the `workspaces` field in a `package.json`
 */
export type PkgJsonWorkspaces =
  | PkgJsonWorkspaceConfig
  | PkgJsonWorkspacePatterns;

/**
 * {@inheritDoc PkgJsonWorkspacePatterns}
 */
export const PkgJsonWorkspacePatternsSchema: z.ZodType<PkgJsonWorkspacePatterns> =
  NonEmptyNonEmptyStringArraySchema;

/**
 * {@inheritDoc PkgJsonWorkspaceConfig}
 */
export const PkgJsonWorkspaceConfigSchema: z.ZodType<PkgJsonWorkspaceConfig> =
  z.object({
    // this seems to be yarn-specific
    nohoist: PkgJsonWorkspacePatternsSchema.optional(),
    packages: PkgJsonWorkspacePatternsSchema.optional(),
  });

/**
 * {@inheritDoc PkgJsonType}
 */
export const PkgJsonTypeSchema: z.ZodType<PkgJsonType> = z
  .literal('module')
  .or(z.literal('commonjs'));

/**
 * {@inheritDoc PkgJsonWorkspaces}
 */
export const PkgJsonWorkspacesSchema: z.ZodType<PkgJsonWorkspaces> =
  PkgJsonWorkspacePatternsSchema.or(PkgJsonWorkspaceConfigSchema);

/**
 * {@inheritDoc NormalizedPackageJson}
 */
export const NormalizedPackageJsonSchema: z.ZodType<PackageJson> = z
  .object({
    _id: z.string().optional().describe('Label'),
    description: z.string().optional().describe('Package description'),
    name: NonEmptyStringSchema.describe('Package name'),
    packageManager: z.string().optional().describe('Preferred package manager'),
    private: z.boolean().optional().describe('Private flag'),
    readme: z.string().optional().describe('Contents of README'),
    type: PkgJsonTypeSchema.optional().describe('Module type'),
    version: VersionStringSchema.describe('Package version'),
    workspaces:
      PkgJsonWorkspacesSchema.optional().describe('Workspaces config'),
  })
  .catchall(JsonValueSchema)
  .describe(`Normalized ${PACKAGE_JSON}`);
