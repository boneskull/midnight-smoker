import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PluginRegistry} from '#plugin/plugin-registry';
import {type WorkspaceInfo} from '#schema/workspaces';
import {fromPromise} from 'xstate';
import {type PkgManagerInitPayload} from './loader-machine-types';

export interface LoadPkgManagersInput {
  plugin: Readonly<PluginMetadata>;
  smokerOptions: SmokerOptions;
  pluginRegistry: PluginRegistry;
  workspaceInfo: WorkspaceInfo[];
}

export const loadPkgManagers = fromPromise<
  PkgManagerInitPayload[],
  LoadPkgManagersInput
>(async ({input: {workspaceInfo, plugin, smokerOptions, pluginRegistry}}) => {
  const pkgManagerDefSpecs = await plugin.loadPkgManagers(workspaceInfo, {
    cwd: smokerOptions.cwd,
    desiredPkgManagers: smokerOptions.pkgManager,
  });
  return pkgManagerDefSpecs.map(({def, spec}) => ({
    plugin,
    def,
    id: pluginRegistry.getComponentId(def),
    spec,
  }));
});

export interface LoadReportersInput {
  plugin: Readonly<PluginMetadata>;
  smokerOptions: SmokerOptions;
  pluginRegistry: PluginRegistry;
}
