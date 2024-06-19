import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type FileManager} from '#util/filemanager';
import {fromPromise} from 'xstate';

/**
 * Input for {@link createTempDir}
 */

export interface CreateTempDirInput {
  fileManager: FileManager;
  spec: StaticPkgManagerSpec;
}

/**
 * Input for {@link pruneTempDir}
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

export const createTempDir = fromPromise<string, CreateTempDirInput>(
  async ({input: {spec, fileManager}, signal}) => {
    return fileManager.createTempDir(`${spec.bin}-${spec.version}`, signal);
  },
);

/**
 * Prunes the package manager's temporary directory.
 *
 * This happens after the teardown lifecycle hook
 */

export const pruneTempDir = fromPromise<void, PruneTempDirInput>(
  async ({input: {tmpdir, fileManager}, signal}) => {
    await fileManager.pruneTempDir(tmpdir, signal);
  },
);
