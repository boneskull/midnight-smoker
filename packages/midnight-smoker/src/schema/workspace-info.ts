import {
  NormalizedPackageJsonSchema,
  type PackageJson,
} from '#schema/package-json';
import {NonEmptyStringSchema} from '#schema/util/util';
import * as R from 'remeda';
import {z} from 'zod';

/**
 * **For extension only**.
 *
 * @internal
 */
export const BaseWorkspaceInfoSchema = z.object({
  localPath: NonEmptyStringSchema,
  pkgJson: NormalizedPackageJsonSchema,
  pkgJsonPath: NonEmptyStringSchema,
  pkgJsonSource: NonEmptyStringSchema,
  pkgName: NonEmptyStringSchema,
  private: z.boolean().optional(),
});

/**
 * Schema for a {@link WorkspaceInfo}.
 *
 * @remarks
 * `WorkspaceInfo` is not a value that we expect a plugin author to ever need to
 * provide.
 * @see {@link WorkspaceInfo}
 */
export const WorkspaceInfoSchema: z.ZodType<WorkspaceInfo> =
  BaseWorkspaceInfoSchema.readonly();

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
  pkgJson: PackageJson;

  /**
   * The absolute path to the workspace's `package.json`
   *
   * @remarks
   * Could this ever differ from `localPath + path.sep + 'package.json'`?
   */
  pkgJsonPath: string;

  /**
   * The source of `package.json`
   */
  pkgJsonSource: string;

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
}>;

/**
 * Strips properties from an object extending {@link WorkspaceInfo}.
 *
 * @param workspaceInfo Something extending {@link WorkspaceInfo}
 * @returns New object
 */
export function toWorkspaceInfo(workspaceInfo: WorkspaceInfo): WorkspaceInfo;

export function toWorkspaceInfo(...args: unknown[]) {
  return R.purry(toWorkspaceInfo_, args);
}

const toWorkspaceInfo_ = (workspaceInfo: WorkspaceInfo): WorkspaceInfo =>
  R.pick(workspaceInfo, R.keys(BaseWorkspaceInfoSchema.shape));
