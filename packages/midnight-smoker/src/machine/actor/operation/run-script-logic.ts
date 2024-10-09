import {ERROR, FAILED} from '#constants';
import {
  type PkgManagerRunScriptContext,
  type RunScriptManifest,
} from '#defs/pkg-manager';
import {AbortError} from '#error/abort-error';
import {RunScriptError} from '#error/run-script-error';
import {ScriptFailedError} from '#error/script-failed-error';
import {UnknownScriptError} from '#error/unknown-script-error';
import {
  type RunScriptResult,
  type RunScriptResultError,
  type RunScriptResultFailed,
} from '#schema/run-script-result';
import {fromUnknownError} from '#util/from-unknown-error';
import {isAbortError} from '#util/guard/abort-error';
import {isSmokerError} from '#util/guard/smoker-error';
import {fromPromise} from 'xstate';

import {type OperationLogicInput} from './logic';

/**
 * Input for {@link runScriptLogic}
 */
export type RunScriptLogicInput =
  OperationLogicInput<PkgManagerRunScriptContext>;

/**
 * Output of {@link runScriptLogic}
 */
export interface RunScriptLogicOutput {
  manifest: RunScriptManifest;
  result: RunScriptResult;
}

/**
 * Runs a script
 *
 * This should trap errors coming out of a {@link PkgManager.runScript}
 * implementation, and coerces these into a {@link RunScriptLogicOutput.result}
 * object of type `RunScriptResultError`.
 *
 * Any other errors are wrapped in a {@link UnknownScriptError}.
 *
 * Note that a `ScriptFailedError` should be embedded in the result--not
 * thrown--if the `runScript` method is doing what it's supposed to be doing.
 */
export const runScriptLogic = fromPromise<
  RunScriptLogicOutput,
  RunScriptLogicInput
>(
  async ({
    input: {
      ctx,
      envelope: {pkgManager},
    },
    self,
    signal,
  }) => {
    if (signal.aborted) {
      throw new AbortError(signal.reason, self.id);
    }
    await Promise.resolve();
    const {manifest} = ctx;
    try {
      const result = await pkgManager.runScript({...ctx, signal});
      return {manifest, result};
    } catch (err) {
      if (isAbortError(err)) {
        if (isSmokerError(AbortError, err)) {
          throw err;
        }
        throw new AbortError(err.message || signal.reason, self.id);
      }
      let result: RunScriptResultError | RunScriptResultFailed;
      if (
        isSmokerError(RunScriptError, err) ||
        isSmokerError(UnknownScriptError, err)
      ) {
        result = {error: err, manifest, type: ERROR};
      } else if (isSmokerError(ScriptFailedError, err)) {
        result = {error: err, manifest, type: FAILED};
      } else {
        result = {
          error: new UnknownScriptError(
            `Failed to run script ${manifest.script} for package ${manifest.pkgName}`,
            manifest.script,
            manifest.pkgName,
            fromUnknownError(err),
          ),
          manifest,
          type: ERROR,
        };
      }
      return {manifest, result};
    }
  },
);
