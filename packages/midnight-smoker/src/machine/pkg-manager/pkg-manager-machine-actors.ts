import {type PkgManager} from '#pkg-manager';
import {
  type InstallManifest,
  type InstallResult,
  type PackOptions,
  type RunScriptManifest,
  type RunScriptResult,
} from '#schema';
import {fromPromise} from 'xstate';

export interface PackParams {
  opts?: PackOptions;
  pkgManager: PkgManager;
  signal: AbortSignal;
}

export const pack = fromPromise<InstallManifest[], PackParams>(
  async ({input: {signal, pkgManager, opts}}): Promise<InstallManifest[]> =>
    pkgManager.pack(signal, opts),
);

export const setupPkgManager = fromPromise<void, PkgManager>(
  async ({input: pkgManager}): Promise<void> => {
    await pkgManager.setup();
  },
);

export const teardownPkgManager = fromPromise<void, PkgManager>(
  async ({input: pkgManager}): Promise<void> => {
    await pkgManager.teardown();
  },
);

export interface InstallParams {
  installManifests: InstallManifest[];
  pkgManager: PkgManager;
  signal: AbortSignal;
}

export const install = fromPromise<InstallResult, InstallParams>(
  async ({
    input: {signal, pkgManager, installManifests},
  }): Promise<InstallResult> => {
    return pkgManager.install(installManifests, signal);
  },
);

export interface RunScriptsParams {
  pkgManager: PkgManager;
  runScriptManifests: RunScriptManifest[];
  signal: AbortSignal;
}

export const runScripts = fromPromise<RunScriptResult[], RunScriptsParams>(
  async ({input: {runScriptManifests, pkgManager, signal}}) =>
    Promise.all(
      runScriptManifests.map(async (runScriptManifest) =>
        pkgManager.runScript(runScriptManifest, signal),
      ),
    ),
);

export {scriptRunnerMachine as scriptRunner} from '../script-runner-machine';
