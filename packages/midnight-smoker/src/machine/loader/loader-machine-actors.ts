import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {fromPromise} from 'xstate';
import {type PkgManagerInitPayload} from './loader-machine-types';

export interface LoadPkgManagersInput {
  cwd?: string;
  plugin: Readonly<PluginMetadata>;
  smokerOpts: SmokerOptions;
}

export const loadPkgManagers = fromPromise<
  PkgManagerInitPayload[],
  LoadPkgManagersInput
>(async ({input: {plugin, cwd, smokerOpts}}) => {
  const pkgManagerDefSpecs = await plugin.loadPkgManagers({
    cwd,
    desiredPkgManagers: smokerOpts.pkgManager,
  });
  return pkgManagerDefSpecs.map((defSpec) => ({...defSpec, plugin}));
});
