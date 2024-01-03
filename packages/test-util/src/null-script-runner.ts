import type {ScriptRunner} from 'midnight-smoker/plugin';
import {Errors} from 'midnight-smoker/plugin';
export const nullScriptRunner: ScriptRunner.ScriptRunner = async (
  notifiers: ScriptRunner.ScriptRunnerNotifiers,
  pkgManagerRunManifest: ScriptRunner.PkgManagerRunScriptManifest,
  opts: ScriptRunner.ScriptRunnerOpts,
): Promise<ScriptRunner.RunScriptResult> => {
  await Promise.resolve();
  if (opts.signal.aborted) {
    throw new Errors.RunScriptBailed();
  }
  const {script, pkgName} = pkgManagerRunManifest;
  notifiers.scriptBegin({
    script,
    pkgName,
  });

  await Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (opts.signal.aborted) {
    throw new Errors.RunScriptBailed();
  }
  const result: ScriptRunner.RunScriptResult = {
    pkgName,
    script,
    rawResult: {
      stdout: '',
      stderr: '',
      command: '',
      exitCode: 0,
      failed: false,
    },
  };

  notifiers.scriptOk({
    pkgName,
    script,
  });

  return result;
};
