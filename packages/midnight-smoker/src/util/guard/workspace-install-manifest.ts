import type {
  InstallManifest,
  WorkspaceInstallManifest,
} from '#schema/install-manifest';

/**
 * Type guard for an {@link WorkspaceInstallManifest} which originated in a
 * workspace (in other words, _not_ an additional dependency)
 *
 * @param value Install manifest to check
 * @returns `true` if `value` is a workspace manifest
 */
export function isWorkspaceInstallManifest(
  value: InstallManifest,
): value is WorkspaceInstallManifest {
  return Boolean(value.installPath && value.localPath && !value.isAdditional);
}
