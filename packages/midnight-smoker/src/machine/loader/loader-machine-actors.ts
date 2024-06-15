import {type SmokerOptions} from '#options/options';
import {loadPackageManagers} from '#pkg-manager/pkg-manager-loader';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PluginRegistry} from '#plugin/plugin-registry';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {isEmpty} from 'lodash';
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
  const {pkgManagerDefs: defs} = plugin;
  if (isEmpty(defs)) {
    return [];
  }
  const {cwd, pkgManager: desiredPkgManagers = []} = smokerOptions;
  const defSpecs = await loadPackageManagers(defs, workspaceInfo, {
    cwd,
    desiredPkgManagers,
  });
  return defSpecs.map(({def, spec}) => ({
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
