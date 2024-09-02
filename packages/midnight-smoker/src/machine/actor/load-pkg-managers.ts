import {type PkgManagerEnvelope} from '#plugin/component-envelope';
import {type PluginRegistry} from '#plugin/registry';
import {type SmokerOptions} from '#schema/smoker-options';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {fromPromise} from 'xstate';

/**
 * Input for {@link loadPkgManagersLogic}
 */
export interface LoadPkgManagersLogicInput {
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  workspaceInfo: WorkspaceInfo[];
}

/**
 * Output for {@link loadPkgManagersLogic}
 */
export type LoadPkgManagersLogicOutput = PkgManagerEnvelope[];

/**
 * Logic which attempts to match package managers defined by a given plugin with
 * those requested by the user.
 *
 * Resolves w/ an array of {@link PkgManagerEnvelope} objects in its
 * {@link LoadPkgManagersLogicOutput output}. May be empty if the plugin cannot
 * support the requested package managers.
 */
export const loadPkgManagersLogic = fromPromise<
  LoadPkgManagersLogicOutput,
  LoadPkgManagersLogicInput
>(async ({input: {pluginRegistry, smokerOptions, workspaceInfo}}) => {
  return await pluginRegistry.enabledPkgManagers(workspaceInfo, smokerOptions);
});
