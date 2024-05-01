import {type PkgManager} from '#pkg-manager';
import {type SomeReporter} from '#reporter';
import {type FileManager} from '#util';
import {fromPromise} from 'xstate';

/**
 * Executes the {@link PkgManager.teardown} method on all package managers.
 */
export const teardownPkgManagers = fromPromise<void, PkgManager[]>(
  async ({input: pkgManagers}): Promise<void> => {
    await Promise.all(pkgManagers.map((pkgManager) => pkgManager.teardown()));
  },
);

/**
 * Executes the {@link PkgManager.setup} method on all package managers.
 */
export const setupPkgManagers = fromPromise<void, PkgManager[]>(
  async ({input: pkgManagers}): Promise<void> => {
    await Promise.all(pkgManagers.map((pkgManager) => pkgManager.setup()));
  },
);

/**
 * Executes the {@link Reporter.setup} method on all reporters.
 */
export const setupReporters = fromPromise<void, SomeReporter[]>(
  async ({input: reporters}): Promise<void> => {
    await Promise.all(reporters.map((reporter) => reporter.setup()));
  },
);

/**
 * Executes the {@link Reporter.teardown} method on all reporters.
 */
export const teardownReporters = fromPromise<void, SomeReporter[]>(
  async ({input: reporters}): Promise<void> => {
    await Promise.all(reporters.map((reporter) => reporter.teardown()));
  },
);

export interface PruneTempDirsParams {
  pkgManagers: PkgManager[];
  fileManager: FileManager;
}

export const pruneTempDirs = fromPromise<void, PruneTempDirsParams>(
  async ({input: {pkgManagers, fileManager}}): Promise<void> => {
    await Promise.all(
      pkgManagers.map(async (pkgManager) => {
        await fileManager.pruneTempDir(pkgManager.tmpdir);
      }),
    );
  },
);
