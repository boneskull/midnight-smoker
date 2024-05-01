import {type SmokerOptions} from '#options';
import {type PluginMetadata} from '#plugin';
import {
  PkgManagerContextSchema,
  type Executor,
  type PkgManagerContext,
  type PkgManagerDefSpec,
  type PkgManagerOpts,
  type ReporterContext,
  type ReporterDef,
  type WorkspaceInfo,
} from '#schema';
import {readSmokerPkgJson, type FileManager} from '#util';
import {type PackageJson} from 'type-fest';
import {fromPromise} from 'xstate';

export interface LoadPkgManagersInput {
  cwd?: string;
  plugin: Readonly<PluginMetadata>;
  smokerOpts: SmokerOptions;
}

export type PkgManagerDefSpecsWithCtx = PkgManagerDefSpec & {
  ctx: PkgManagerContext;
};

export interface CreatePkgManagerContextsInput {
  fm: FileManager;
  systemExecutor: Executor;
  defaultExecutor: Executor;
  pkgManagerOpts?: PkgManagerOpts;
  pkgManagerDefSpecs: PkgManagerDefSpec[];
  workspaceInfo: WorkspaceInfo[];
  useWorkspaces: boolean;
}

export interface CreateReporterContextsInput {
  pkgJson: PackageJson;
  reporterDefs: ReporterDef[];
  smokerOpts: SmokerOptions;
}

export interface ReporterDefWithCtx {
  ctx: ReporterContext;
  def: ReporterDef;
}

export const readSmokerPackageJson = fromPromise<PackageJson, void>(
  readSmokerPkgJson,
);

export const loadPkgManagers = fromPromise<
  PkgManagerDefSpec[],
  LoadPkgManagersInput
>(async ({input: {plugin, cwd, smokerOpts}}) => {
  return plugin.loadPkgManagers({
    cwd,
    desiredPkgManagers: smokerOpts.pkgManager,
  });
});

export const createReporterContexts = fromPromise<
  ReporterDefWithCtx[],
  CreateReporterContextsInput
>(async ({input: {smokerOpts, reporterDefs, pkgJson}}) => {
  return Promise.all(
    reporterDefs.map(async (def) => {
      const ctx: ReporterContext = {
        opts: smokerOpts,
        pkgJson,
      };
      return {def, ctx};
    }),
  );
});

export const createPkgManagerContexts = fromPromise<
  PkgManagerDefSpecsWithCtx[],
  CreatePkgManagerContextsInput
>(
  async ({
    input: {
      pkgManagerDefSpecs,
      fm,
      systemExecutor,
      defaultExecutor,
      pkgManagerOpts,
      workspaceInfo,
      useWorkspaces,
    },
  }) => {
    if (pkgManagerDefSpecs?.length) {
      return Promise.all(
        pkgManagerDefSpecs.map(async ({spec, def}) => {
          const tmpdir = await fm.createTempDir(
            `${spec.pkgManager}-${spec.version}`,
          );
          const executor = spec.isSystem ? systemExecutor : defaultExecutor;
          const ctx = PkgManagerContextSchema.parse({
            spec,
            tmpdir,
            executor,
            workspaceInfo,
            useWorkspaces,
            ...pkgManagerOpts,
          });
          return {spec, def, ctx};
        }),
      );
    }
    throw new Error('No pkgManagerDefSpecs');
  },
);
