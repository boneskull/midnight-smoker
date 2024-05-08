import {type SmokerOptions} from '#options';
import {type PluginMetadata} from '#plugin';
import {
  type PkgManagerContext,
  type PkgManagerDefSpec,
  type ReporterContext,
  type ReporterDef,
} from '#schema';
import {readSmokerPkgJson} from '#util';
import {type PackageJson} from 'type-fest';
import {fromPromise} from 'xstate';
import {PkgManagerInitPayload} from './reifier-machine';

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

export const readSmokerPackageJson = fromPromise<PackageJson, void>(
  readSmokerPkgJson,
);

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
