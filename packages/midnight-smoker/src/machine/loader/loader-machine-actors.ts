import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PluginRegistry} from '#plugin/plugin-registry';
import {type WorkspaceInfo} from '#schema/workspaces';
import {isFunction} from 'lodash';
import {fromPromise} from 'xstate';
import {
  type PkgManagerInitPayload,
  type ReporterInitPayload,
} from './loader-machine-types';

export interface LoadPkgManagersInput {
  plugin: Readonly<PluginMetadata>;
  smokerOpts: SmokerOptions;
  pluginRegistry: PluginRegistry;
  workspaceInfo: WorkspaceInfo[];
}

export const loadPkgManagers = fromPromise<
  PkgManagerInitPayload[],
  LoadPkgManagersInput
>(async ({input: {workspaceInfo, plugin, smokerOpts, pluginRegistry}}) => {
  const pkgManagerDefSpecs = await plugin.loadPkgManagers(workspaceInfo, {
    cwd: smokerOpts.cwd,
    desiredPkgManagers: smokerOpts.pkgManager,
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

export const loadReporters = fromPromise<
  ReporterInitPayload[],
  LoadReportersInput
>(async ({input: {plugin, smokerOptions, pluginRegistry}}) => {
  const {reporterDefs} = plugin;
  const desiredReporters = new Set(smokerOptions.reporter);
  const enabledReporterDefs = reporterDefs.filter((def) => {
    const id = pluginRegistry.getComponentId(def);
    if (desiredReporters.has(id)) {
      return true;
    }
    return isFunction(def.when) ? def.when(smokerOptions) : false;
  });

  return enabledReporterDefs.map((def) => ({
    def,
    plugin,
    id: pluginRegistry.getComponentId(def),
  }));
});
