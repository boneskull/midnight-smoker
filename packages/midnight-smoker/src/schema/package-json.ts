/**
 * Schemas and types relating to `package.json` files.
 *
 * This defines a subset of the `package.json` format, as we don't care about
 * the vast majority of it.
 *
 * @packageDocumentation
 */
import {PACKAGE_JSON} from '#constants';
import {JsonValueSchema} from '#schema/util/json';
import {VersionStringSchema} from '#schema/util/version';
import {type Package as NpmNormalizedPackageJson} from 'normalize-package-data';
import {
  type Merge,
  type SetOptional,
  type PackageJson as TypeFestPackageJson,
} from 'type-fest';
import {z} from 'zod';

import {
  NonEmptyNonEmptyStringArraySchema,
  NonEmptyStringSchema,
} from './util/util';

/**
 * A normalized `package.json` file.
 *
 * This is based on the "official" normalized `package.json` file, per
 * `normalize-package-data`, and adds additional types from `type-fest` which
 * `normalize-package-data` ignores.
 *
 * @privateRemarks
 * `_id` may be used at some point, but I don't see what we'd need `readme` for.
 */
export type PackageJson = SetOptional<
  Merge<TypeFestPackageJson, NpmNormalizedPackageJson>,
  '_id' | 'readme'
>;

/**
 * A de-normalized (a "non-normalized?") `package.json` file.
 *
 * This type reconciles the {@link TypeFestPackageJson PackageJson} type from
 * `type-fest` with {@link PackageJson our normalized PackageJson type}; in some
 * cases the latter claims a possible type where the former does not.
 */
export type DenormalizedPackageJson = Merge<
  TypeFestPackageJson,
  Pick<
    PackageJson | TypeFestPackageJson,
    'author' | 'bundleDependencies' | 'contributors' | 'maintainers'
  >
>;

/**
 * The value of the `type` field of a `package.json` file.
 *
 * @see {@link DenormalizedPackageJson}
 */
export type PackageType = TypeFestPackageJson['type'];

/**
 * The value of the `workspaces` field in a `package.json` when it is an object.
 *
 * @see {@link PkgJsonWorkspaces}
 */
export type PkgJsonWorkspaceConfig = TypeFestPackageJson.WorkspaceConfig;

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
 * {@inheritDoc PackageType}
 */
export const PackageTypeSchema: z.ZodType<PackageType> = z
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
    type: PackageTypeSchema.optional().describe('Module type'),
    version: VersionStringSchema.describe('Package version'),
    workspaces:
      PkgJsonWorkspacesSchema.optional().describe('Workspaces config'),
  })
  .catchall(JsonValueSchema)
  .describe(`Normalized ${PACKAGE_JSON}`);
