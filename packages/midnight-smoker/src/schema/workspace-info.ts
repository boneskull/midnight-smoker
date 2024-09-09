import {
  type NormalizedPackageJson,
  NormalizedPackageJsonSchema,
} from '#schema/package-json';
import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * Schema for a {@link WorkspaceInfo}.
 *
 * @remarks
 * `WorkspaceInfo` is not a value that we expect a plugin author to ever need to
 * provide. This is only used for composition with other schemas that build upon
 * it.
 * @see {@link WorkspaceInfo}
 */
export const WorkspaceInfoSchema = z.strictObject({
  localPath: NonEmptyStringSchema,
  pkgJson: NormalizedPackageJsonSchema,
  pkgJsonPath: NonEmptyStringSchema,
  pkgName: NonEmptyStringSchema,
  private: z.boolean().optional(),
  rawPkgJson: z.string(),
});

/**
 * Information about a _workspace_ in the package-manager parlance.
 */
export type WorkspaceInfo = Readonly<{
  /**
   * Absolute path to the workspace
   */
  localPath: string;

  /**
   * The `package.json` for the workspace, or some subset thereof.
   */
  pkgJson: NormalizedPackageJson;

  /**
   * The absolute path to the workspace's `package.json`
   *
   * @remarks
   * Could this ever differ from `localPath + path.sep + 'package.json'`?
   */
  pkgJsonPath: string;

  /**
   * Name of the package.
   *
   * @remarks
   * Corresponds to `name` field of the `package.json`
   */
  pkgName: string;

  /**
   * Whether the workspace is private.
   *
   * @remarks
   * Corresponds to the `private` field of the `package.json`
   */
  private?: boolean;

  /**
   * A Momoa AST representing the `package.json` file.
   *
   * This probably doesn't need to be used directly.
   */
  rawPkgJson: string;
}>;
