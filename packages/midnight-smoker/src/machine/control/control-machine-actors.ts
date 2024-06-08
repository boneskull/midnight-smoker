import {PACKAGE_JSON} from '#constants';
import {AbortError} from '#error/abort-error';
import {WorkspacesConfigSchema, type WorkspaceInfo} from '#schema/workspaces';
import {type FileManager} from '#util/filemanager';
import assert from 'assert';
import {isEmpty, partition} from 'lodash';
import {minimatch} from 'minimatch';
import path from 'path';
import {type PackageJson} from 'type-fest';
import {fromPromise} from 'xstate';

export interface QueryWorkspacesInput {
  all: boolean;
  cwd: string;
  fileManager: FileManager;
  workspace: string[];
  signal: AbortSignal;
}

export interface ReadSmokerPkgJsonInput {
  fileManager: FileManager;
  signal: AbortSignal;
}

export const readSmokerPkgJson = fromPromise<
  PackageJson,
  ReadSmokerPkgJsonInput
>(async ({input: {fileManager, signal}}) => {
  if (signal.aborted) {
    throw new AbortError(signal.reason);
  }
  return fileManager.readSmokerPkgJson();
});

export const queryWorkspaces = fromPromise<
  WorkspaceInfo[],
  QueryWorkspacesInput
>(
  async ({
    input: {
      cwd,
      fileManager,
      all: allWorkspaces,
      workspace: onlyWorkspaces,
      signal,
    },
  }): Promise<WorkspaceInfo[]> => {
    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }

    const {packageJson: rootPkgJson, path: rootPkgJsonPath} =
      await fileManager.findPkgUp(cwd, {
        strict: true,
      });

    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }

    const getWorkspaceInfo = async (
      patterns: string[],
      pickPkgNames: string[] = [],
    ): Promise<WorkspaceInfo[]> => {
      const workspacePaths = await fileManager.glob(patterns, {
        cwd,
        withFileTypes: true,
        signal,
      });
      let workspaces = await Promise.all(
        workspacePaths
          .filter((workspace) => workspace.isDirectory())
          .map(async (workspace) => {
            const fullpath = workspace.fullpath();
            const pkgJsonPath = path.join(fullpath, PACKAGE_JSON);
            const workspacePkgJson = await fileManager.readPkgJson(
              pkgJsonPath,
              {signal},
            );
            assert.ok(
              workspacePkgJson.name,
              `no package name in workspace ${PACKAGE_JSON}: ${pkgJsonPath}`,
            );
            return {
              pkgName: workspacePkgJson.name,
              localPath: fullpath,
              pkgJson: workspacePkgJson,
              pkgJsonPath,
            } as WorkspaceInfo;
          }),
      );
      // TODO maybe make this an option; ignore private workspaces
      workspaces = workspaces.filter(({pkgJson}) => pkgJson.private !== true);
      if (!isEmpty(pickPkgNames)) {
        workspaces = workspaces.filter(({pkgName}) =>
          pickPkgNames.includes(pkgName),
        );
      }
      return workspaces;
    };

    const result = WorkspacesConfigSchema.safeParse(rootPkgJson.workspaces);

    let patterns: string[] = [];
    if (result.success) {
      patterns = result.data;
      if (allWorkspaces) {
        return getWorkspaceInfo(patterns);
      }
      if (!isEmpty(onlyWorkspaces)) {
        // a workspace, per npm's CLI, can be a package name _or_ a path.
        // we can detect a path by checking if any of the workspace patterns
        // in the root package.json match the workspace.
        const [pickPaths, pickPkgNames] = partition(
          onlyWorkspaces.map((onlyWs) =>
            path.isAbsolute(onlyWs) ? path.relative(cwd, onlyWs) : onlyWs,
          ),
          (onlyWs) => patterns.some((ws) => minimatch(onlyWs, ws)),
        );

        if (isEmpty(pickPaths)) {
          if (isEmpty(pickPkgNames)) {
            // TODO this might be an error; SOMETHING should match
          }
          return getWorkspaceInfo(patterns, pickPkgNames);
        }
        return getWorkspaceInfo(pickPaths, pickPkgNames);
      }
      // if we get here, then `workspaces` in the root package.json is just empty
    }

    assert.ok(
      rootPkgJson.name,
      `no package name in root ${PACKAGE_JSON}: ${rootPkgJsonPath}`,
    );

    return [
      {
        pkgName: rootPkgJson.name,
        pkgJson: rootPkgJson,
        pkgJsonPath: rootPkgJsonPath,
        localPath: cwd,
      } as WorkspaceInfo,
    ];
  },
);
