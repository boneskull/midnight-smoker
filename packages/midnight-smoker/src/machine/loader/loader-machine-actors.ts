import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PluginRegistry} from '#plugin/plugin-registry';
import {isFunction} from 'lodash';
import {fromPromise} from 'xstate';
import {
  type PkgManagerInitPayload,
  type ReporterInitPayload,
} from './loader-machine-types';

export interface LoadPkgManagersInput {
  plugin: Readonly<PluginMetadata>;
  smokerOpts: SmokerOptions;
}

export const loadPkgManagers = fromPromise<
  PkgManagerInitPayload[],
  LoadPkgManagersInput
>(async ({input: {plugin, smokerOpts}}) => {
  const pkgManagerDefSpecs = await plugin.loadPkgManagers({
    cwd: smokerOpts.cwd,
    desiredPkgManagers: smokerOpts.pkgManager,
  });
  return pkgManagerDefSpecs.map((defSpec) => ({...defSpec, plugin}));
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

  return enabledReporterDefs.map((def) => ({def, plugin}));
});
