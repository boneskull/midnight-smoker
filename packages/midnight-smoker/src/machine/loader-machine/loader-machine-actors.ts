import {type SmokerOptions} from '#options';
import {type PluginMetadata} from '#plugin';
import {
  type PkgManagerContext,
  type PkgManagerDefSpec,
  type ReporterContext,
  type ReporterDef,
} from '#schema';
import {fromPromise} from 'xstate';
import {type PkgManagerInitPayload} from './loader-machine';

export interface LoadPkgManagersInput {
  cwd?: string;
  plugin: Readonly<PluginMetadata>;
  smokerOpts: SmokerOptions;
}

export type PkgManagerDefSpecsWithCtx = PkgManagerDefSpec & {
  ctx: PkgManagerContext;
};

export interface ReporterDefWithCtx {
  ctx: ReporterContext;
  def: ReporterDef;
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
