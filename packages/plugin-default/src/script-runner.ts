/**
 * Provides a serial script runner.
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import {isError} from 'lodash';
import {type PluginAPI} from 'midnight-smoker/plugin';
import type * as SR from 'midnight-smoker/script-runner';

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
   * @param pkgManager - Package manager to use for script execution.
   * @param opts - Options for script execution.
   * @returns A promise that resolves to an array of script execution results.
   */
  const smokerScriptRunner: SR.ScriptRunner = async (
    {scriptBegin, scriptOk, scriptFailed},
    runManifest,
    pkgManager,
    {signal},
  ): Promise<SR.RunScriptResult> => {
    if (signal?.aborted) {
      throw new api.Errors.ScriptBailed();
    }

    const {script, pkgName} = runManifest;

    let result: SR.RunScriptResult;

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
      if (err instanceof api.ScriptRunner.ScriptBailed) {
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
    if (signal?.aborted) {
      throw new api.ScriptRunner.ScriptBailed();
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
