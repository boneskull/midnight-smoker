import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type FileManager} from '#util/filemanager';
import {fromPromise} from 'xstate';

/**
 * Input for {@link createTempDirLogic}
 */

export interface CreateTempDirInput {
  fileManager: FileManager;
  spec: StaticPkgManagerSpec;
}

/**
 * Input for {@link pruneTempDirLogic}
 */

export interface PruneTempDirInput {
  fileManager: FileManager;
  tmpdir: string;
}

/**
 * Creates a temp dir for the package manager.
 *
 * Happens prior to the "setup" lifecycle hook
 */

export const createTempDirLogic = fromPromise<string, CreateTempDirInput>(
  async ({input: {fileManager, spec}, signal}) => {
    return fileManager.createTempDir(`${spec.bin}-${spec.version}`, signal);
  },
);

/**
 * Prunes the package manager's temporary directory.
 *
 * This happens after the teardown lifecycle hook
 */

export const pruneTempDirLogic = fromPromise<void, PruneTempDirInput>(
  async ({input: {fileManager, tmpdir}, signal}) => {
    await fileManager.pruneTempDir(tmpdir, signal);
  },
);
