import {PACKAGE_JSON} from '#constants';
import {InvalidPkgJsonError} from '#error/invalid-pkg-json-error';
import {
  type DenormalizedPackageJson,
  NormalizedPackageJsonSchema,
  type PackageJson,
  PkgJsonWorkspacesSchema,
} from '#schema/package-json';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {FileManager} from '#util/filemanager';
import {hrRelativePath} from '#util/format';
import {isEmpty} from '#util/guard/common';
import * as hwp from '#util/hwp';
import assert from 'assert';
import {minimatch} from 'minimatch';
import path from 'path';
import {partition, uniqueBy} from 'remeda';
import {fromPromise} from 'xstate';
import {type ZodError} from 'zod';

export interface QueryWorkspacesLogicInput {
  all: boolean;
  cwd: string;
  fileManager?: FileManager;
  workspace?: string[];
}

/**
 * Normalize a `package.json` object, insofar as we want to normalize it.
 *
 * @privateRemarks
 * Should this be the default behavior when `{normalize: true}` provided to
 * `readPkgJson`, or should we continue to allow `normalize-pkg-data` to handle
 * it?
 * @param pkgJson A parsed `package.json` obj
 * @returns A "normalized" `package.json` obj
 */
function normalizePkgJson(
  pkgJson: DenormalizedPackageJson,
  pkgJsonPath: string,
): PackageJson {
  return NormalizedPackageJsonSchema.parse(pkgJson, {
    errorMap: (issue, ctx) => {
      return {
        message: `${pkgJsonPath}: ${issue.message ?? ctx.defaultError}`,
      };
    },
  });
}

export const queryWorkspacesLogic = fromPromise<
  WorkspaceInfo[],
  QueryWorkspacesLogicInput
>(
  async ({
    input: {
      all: allWorkspaces,
      cwd,
      fileManager = FileManager.create(),
      workspace: onlyWorkspaces = [],
    },
    signal,
  }): Promise<WorkspaceInfo[]> => {
    const {
      packageJson: rootPackageJson,
      path: rootPkgJsonPath,
      rawPackageJson: rawRootPkgJson,
    } = await fileManager.findPkgUp(cwd, {
      signal,
      strict: true,
    });

    let rootPkgJson: PackageJson;

    try {
      rootPkgJson = normalizePkgJson(rootPackageJson, rootPkgJsonPath);
    } catch (err) {
      throw new InvalidPkgJsonError(
        `Invalid ${PACKAGE_JSON} at ${hrRelativePath(
          rootPkgJsonPath,
          path.dirname(rootPkgJsonPath),
        )}`,
        err as ZodError,
        rootPkgJsonPath,
      );
    }

    /**
     * @param wsPatterns Array of workspace pattterns from `workspaces` field in
     *   `package.json`
     * @param pickPkgNames Array of package names to pick from the patterns
     * @returns
     */
    const getWorkspaceInfo = async (
      wsPatterns: string[],
      pickPkgNames: string[] = [],
    ): Promise<WorkspaceInfo[]> => {
      const isPickedPkg = isEmpty(pickPkgNames)
        ? () => true
        : (pkgName: string) => pickPkgNames.includes(pkgName);

      const workspaces: WorkspaceInfo[] = await hwp.flatMap(
        fileManager.globIterate(wsPatterns, {
          cwd,
          signal,
          withFileTypes: true,
        }),
        async (workspacePath, {signal}) => {
          if (signal.aborted || !workspacePath.isDirectory()) {
            return [];
          }

          const fullpath = workspacePath.fullpath();
          const pkgJsonPath = path.join(fullpath, PACKAGE_JSON);
          // it appears we're not sending `normalize: true` here so that we can
          // trap the errors and display them a certain way
          const {packageJson, rawPackageJson: rawPkgJson} =
            await fileManager.readPkgJson(pkgJsonPath, {
              signal,
            });

          let workspacePkgJson: PackageJson;
          try {
            workspacePkgJson = normalizePkgJson(packageJson, pkgJsonPath);
          } catch (err) {
            throw new InvalidPkgJsonError(
              `Invalid ${PACKAGE_JSON} in workspace ${hrRelativePath(
                rootPkgJsonPath,
              )}`,
              err as ZodError,
              rootPkgJsonPath,
            );
          }

          if (
            signal.aborted ||
            !workspacePkgJson ||
            !isPickedPkg(workspacePkgJson.name)
          ) {
            return [];
          }

          return [
            {
              localPath: fullpath,
              pkgJson: workspacePkgJson,
              pkgJsonPath,
              pkgName: workspacePkgJson.name,
              private: !!workspacePkgJson.private,
              rawPkgJson,
            },
          ];
        },
      );
      return workspaces;
    };

    const result = PkgJsonWorkspacesSchema.safeParse(rootPkgJson.workspaces);

    let workspaceInfo: WorkspaceInfo[] = [];
    if (result.success) {
      const {data} = result;

      const patterns: string[] = (
        Array.isArray(data)
          ? data
          : [...(data.packages ?? []), ...(data.nohoist ?? [])]
      ).map((pattern) => path.normalize(pattern));

      if (allWorkspaces) {
        workspaceInfo = await getWorkspaceInfo(patterns);
      } else if (!isEmpty(onlyWorkspaces)) {
        // a workspace, per npm's CLI, can be a package name _or_ a path.
        // we can detect a path by checking if any of the workspace patterns
        // in the root package.json match the workspace.
        const relWorkspaces = onlyWorkspaces.map((onlyWs) => {
          const normalized = path.normalize(onlyWs);
          return path.isAbsolute(normalized)
            ? path.relative(cwd, normalized)
            : normalized;
        });

        const [pickPaths, pickPkgNames] = partition(relWorkspaces, (onlyWs) =>
          patterns.some((ws) => minimatch(onlyWs, ws)),
        );
        const promises: Promise<WorkspaceInfo[]>[] = [];

        // if we found some paths matching the patterns, then look for those
        if (!isEmpty(pickPaths)) {
          promises.push(getWorkspaceInfo(pickPaths));
        }
        // if we found things that might be package names, look for those too
        if (!isEmpty(pickPkgNames)) {
          promises.push(getWorkspaceInfo(patterns, pickPkgNames));
        }
        // since it's possible for these to overlap, we gotta dedupe it
        workspaceInfo = (await Promise.all(promises)).flat();
      }
    }

    if (isEmpty(workspaceInfo)) {
      assert.ok(
        rootPkgJson.name,
        `no package name in root ${PACKAGE_JSON}: ${rootPkgJsonPath}`,
      );

      workspaceInfo = [
        {
          localPath: cwd,
          pkgJson: rootPkgJson,
          pkgJsonPath: rootPkgJsonPath,
          pkgName: rootPkgJson.name,
          private: !!rootPkgJson.private,
          rawPkgJson: rawRootPkgJson,
        },
      ];
    }

    return uniqueBy(workspaceInfo, (ws) => ws.localPath);
  },
);
