import {PACKAGE_JSON} from '#constants';
import {
  WorkspacesConfigSchema,
  type WorkspaceInfo,
} from '#schema/workspace-info';
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
}

export interface ReadSmokerPkgJsonInput {
  fileManager: FileManager;
}

export const readSmokerPkgJson = fromPromise<
  PackageJson,
  ReadSmokerPkgJsonInput
>(async ({input: {fileManager}, signal}) => {
  return fileManager.readSmokerPkgJson({signal});
});

export const queryWorkspaces = fromPromise<
  WorkspaceInfo[],
  QueryWorkspacesInput
>(
  async ({
    input: {cwd, fileManager, all: allWorkspaces, workspace: onlyWorkspaces},
    signal,
  }): Promise<WorkspaceInfo[]> => {
    const {packageJson: rootPkgJson, path: rootPkgJsonPath} =
      await fileManager.findPkgUp(cwd, {
        strict: true,
        signal,
      });

    const getWorkspaceInfo = async (
      patterns: string[],
      pickPkgNames: string[] = [],
    ): Promise<WorkspaceInfo[]> => {
      const workspaces: WorkspaceInfo[] = [];

      const isPickedPkg = isEmpty(pickPkgNames)
        ? () => true
        : (pkgName: string) => pickPkgNames.includes(pkgName);

      for await (const workspacePath of fileManager.globIterate(patterns, {
        cwd,
        withFileTypes: true,
        signal,
      })) {
        if (!workspacePath.isDirectory()) {
          continue;
        }
        const fullpath = workspacePath.fullpath();
        const pkgJsonPath = path.join(fullpath, PACKAGE_JSON);
        const workspacePkgJson = await fileManager.readPkgJson(pkgJsonPath, {
          signal,
        });

        // TODO maybe make this an option; "ignore private workspaces"
        if (workspacePkgJson.private === true) {
          continue;
        }
        assert.ok(
          workspacePkgJson.name,
          `no package name in workspace ${PACKAGE_JSON}: ${pkgJsonPath}`,
        );
        if (!isPickedPkg(workspacePkgJson.name)) {
          continue;
        }
        workspaces.push({
          pkgName: workspacePkgJson.name,
          localPath: fullpath,
          pkgJson: workspacePkgJson,
          pkgJsonPath,
        });
      }

      return workspaces;
    };

    const result = WorkspacesConfigSchema.safeParse(rootPkgJson.workspaces);

    let workspaceInfo: WorkspaceInfo[] = [];
    if (result.success && result.data.length) {
      const patterns = result.data;
      if (allWorkspaces) {
        workspaceInfo = await getWorkspaceInfo(patterns);
      } else if (!isEmpty(onlyWorkspaces)) {
        // a workspace, per npm's CLI, can be a package name _or_ a path.
        // we can detect a path by checking if any of the workspace patterns
        // in the root package.json match the workspace.
        const [pickPaths, pickPkgNames] = partition(
          onlyWorkspaces.map((onlyWs) =>
            path.isAbsolute(onlyWs) ? path.relative(cwd, onlyWs) : onlyWs,
          ),
          (onlyWs) => patterns.some((ws) => minimatch(onlyWs, ws)),
        );
        workspaceInfo = await getWorkspaceInfo(
          [...pickPaths, ...patterns],
          pickPkgNames,
        );
      }
    }

    if (isEmpty(workspaceInfo)) {
      assert.ok(
        rootPkgJson.name,
        `no package name in root ${PACKAGE_JSON}: ${rootPkgJsonPath}`,
      );
      workspaceInfo = [
        {
          pkgName: rootPkgJson.name,
          pkgJson: rootPkgJson,
          pkgJsonPath: rootPkgJsonPath,
          localPath: cwd,
        },
      ];
    }

    return workspaceInfo;
  },
);
