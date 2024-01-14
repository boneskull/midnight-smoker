/**
 * Provides a serial script runner.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import {isError} from 'lodash';
import type {PluginAPI, ScriptRunner} from 'midnight-smoker/plugin';

const debug = Debug('midnight-smoker:plugin-default:script-runner');

export function loadScriptRunner(api: PluginAPI) {
  /**
   * Executes scripts defined in a `PkgManagerRunManifest` (which may contain
   * multiple package managers).
   *
   * Scripts are executed in serial (no concurrency).
   *
   * @param notifiers - Run script notifier functions
   * @param runManifest - Object containing information about the script to be
   *   executed.
   * @param opts - Options for script execution.
   * @returns A promise that resolves to an array of script execution results.
   */
  const smokerScriptRunner: ScriptRunner.ScriptRunner = async (
    {scriptBegin, scriptOk, scriptFailed},
    runManifest,
    opts,
  ): Promise<ScriptRunner.RunScriptResult> => {
    const {signal} = opts;

    if (signal.aborted) {
      throw new api.PkgManager.Errors.RunScriptBailed();
    }

    const {pkgManager, script, pkgName} = runManifest;

    let result: ScriptRunner.RunScriptResult;

    scriptBegin({
      script,
      pkgName,
    });

    try {
      debug('Running script "%s" in package %s', script, pkgName);
      result = await pkgManager.runScript(runManifest, {
        signal,
      });
    } catch (err) {
      if (err instanceof api.ScriptRunner.RunScriptBailed) {
        throw err;
      }
      if (isError(err)) {
        throw new api.ScriptRunner.PackageManagerError(
          `Package manager "${pkgManager.spec}" failed to run script "${script}": ${err.message}`,
          pkgManager.spec,
          err,
        );
      }
      throw err;
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (signal.aborted) {
      throw new api.ScriptRunner.RunScriptBailed();
    }

    if (result.error) {
      debug('Script "%s" failed in package "%s": %O', script, pkgName, result);
      scriptFailed({
        ...result,
        error: result.error,
        script,
      });
    } else {
      scriptOk({
        ...result,
        script,
      });
    }

    return result;
  };

  api.defineScriptRunner(smokerScriptRunner);
}
