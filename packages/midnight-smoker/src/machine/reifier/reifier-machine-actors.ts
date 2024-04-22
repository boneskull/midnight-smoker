import {PACKAGE_JSON} from '#constants';
import {type SmokerOptions} from '#options';
import {type PluginMetadata} from '#plugin';
import {
  PkgManagerContextSchema,
  WorkspacesConfigSchema,
  type Executor,
  type PkgManagerContext,
  type PkgManagerDefSpec,
  type PkgManagerOpts,
  type ReporterContext,
  type ReporterDef,
} from '#schema';
import {readSmokerPkgJson, type FileManager} from '#util';
import {Console} from 'console';
import {glob} from 'glob';
import {isFunction} from 'lodash';
import path from 'node:path';
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
  workspaces: Record<string, string>;
}

export interface ReporterStreams {
  stderr: NodeJS.WritableStream;
  stdout: NodeJS.WritableStream;
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

export async function getStreams<Ctx = unknown>(
  def: ReporterDef<Ctx>,
): Promise<ReporterStreams> {
  let stdout: NodeJS.WritableStream = process.stdout;
  let stderr: NodeJS.WritableStream = process.stderr;
  if (def.stdout) {
    stdout = isFunction(def.stdout) ? await def.stdout() : def.stdout;
  }
  if (def.stderr) {
    stderr = isFunction(def.stderr) ? await def.stderr() : def.stderr;
  }
  return {stdout, stderr};
}

export const queryWorkspaces = fromPromise<
  Record<string, string>,
  {cwd: string; fm: FileManager; includeRoot?: boolean}
>(
  async ({
    input: {cwd, fm, includeRoot = false},
  }): Promise<Record<string, string>> => {
    const {packageJson: rootPkgJson} = await fm.findPkgUp(cwd, {
      strict: true,
      normalize: true,
    });

    const getWorkspaceInfo = async (
      paths: string[],
    ): Promise<Record<string, string>> => {
      const workspaces = await glob(paths, {
        cwd,
        withFileTypes: true,
      });
      const entries = await Promise.all(
        workspaces
          .filter((workspace) => workspace.isDirectory())
          .map(async (workspace) => {
            const fullpath = workspace.fullpath();
            const workspacePkgJson = await fm.readPkgJson(
              path.join(fullpath, PACKAGE_JSON),
            );
            return [workspacePkgJson.name ?? '(unknown)', fullpath] as [
              pkgName: string,
              path: string,
            ];
          }),
      );
      return Object.fromEntries(entries);
    };

    const result = WorkspacesConfigSchema.safeParse(rootPkgJson.workspaces);
    let workspaces: string[] = [];
    if (result.success) {
      workspaces = result.data;
      if (includeRoot) {
        workspaces = [cwd, ...workspaces];
      }
    } else {
      workspaces = [cwd];
    }
    return getWorkspaceInfo(workspaces);
  },
);

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
      const {stdout, stderr} = await getStreams(def);
      const console = new Console({stdout, stderr});

      const ctx: ReporterContext = {
        opts: smokerOpts,
        pkgJson,
        console,
        stdout,
        stderr,
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
      pkgManagerOpts: opts,
      workspaces,
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
            workspaceInfo: workspaces,
            ...opts,
          });
          return {spec, def, ctx};
        }),
      );
    }
    throw new Error('No pkgManagerDefSpecs');
  },
);
