import {
  type Executor,
  type StaticPkgManagerSpec,
} from 'midnight-smoker/defs/executor';
import {
  type PkgManagerContext,
  type PkgManagerOpts,
} from 'midnight-smoker/defs/pkg-manager';
import {type FileManager} from 'midnight-smoker/util';
import {fromPromise} from 'xstate';

export interface CreatePkgManagerContextLogicInput {
  executor: Executor;
  fileManager: FileManager;
  linger?: boolean;
  options?: PkgManagerOpts;
  spec: StaticPkgManagerSpec;

  useWorkspaces?: boolean;
}

export const createPkgManagerContextLogic = fromPromise<
  Readonly<PkgManagerContext>,
  CreatePkgManagerContextLogicInput
>(
  async ({
    input: {
      executor,
      fileManager,
      linger = false,
      options,
      spec,
      useWorkspaces,
    },
    signal,
  }) => {
    const tmpdir = await fileManager.createTempDir(
      `${spec.name}-${spec.version}`,
      signal,
    );

    return Object.freeze({
      executor,
      fileManager,
      linger,
      spec,
      tmpdir,
      useWorkspaces,
      ...options,
    });
  },
);

export interface DestroyPkgManagerContextLogicInput {
  ctx: Readonly<PkgManagerContext>;
  fileManager: FileManager;
}

export const destroyPkgManagerContextLogic = fromPromise<
  void,
  DestroyPkgManagerContextLogicInput
>(
  async ({
    input: {
      ctx: {linger, tmpdir},
      fileManager,
    },
    signal,
  }) => {
    if (!linger) {
      await fileManager.pruneTempDir(tmpdir, signal);
    }
  },
);
