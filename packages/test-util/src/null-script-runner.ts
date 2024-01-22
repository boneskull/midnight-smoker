import {EventEmitter} from 'events';
import type * as Event from 'midnight-smoker/event';
import type * as PkgManager from 'midnight-smoker/pkg-manager';
import * as SR from 'midnight-smoker/script-runner';
import {castArray} from 'midnight-smoker/util';

export const nullScriptRunner: SR.ScriptRunner = async (
  notifiers: SR.ScriptRunnerNotifiers,
  pkgManagerRunManifest: SR.PkgManagerRunScriptManifest,
  opts: SR.ScriptRunnerOpts,
): Promise<SR.RunScriptResult> => {
  await Promise.resolve();
  if (opts.signal?.aborted) {
    throw new SR.RunScriptBailed();
  }
  const {script, pkgName} = pkgManagerRunManifest;
  notifiers.scriptBegin({
    script,
    pkgName,
  });

  await Promise.resolve();
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (opts.signal?.aborted) {
    throw new SR.RunScriptBailed();
  }
  const result: SR.RunScriptResult = {
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

/**
 * Options for running a {@link SR}.
 */
export interface RunScriptRunnerOpts
  extends Partial<PkgManager.ScriptRunnerOpts> {
  /**
   * The event emitter to use for emitting events (via the notifier functions).
   * If not provided, a new `EventEmitter` will be created.
   */
  emitter?: EventEmitter;

  bail?: boolean;
}

/**
 * Execute a script runner against one or more
 * {@link SR.PkgManagerRunScriptManifest} objects.
 *
 * This will emit events on a provided
 * {@link RunScriptRunnerOpts.emitter emitter}.
 */
export async function runScriptRunner(
  scriptRunner: SR.ScriptRunner,
  brokerRunManifest:
    | SR.PkgManagerRunScriptManifest[]
    | SR.PkgManagerRunScriptManifest,
  opts: RunScriptRunnerOpts = {},
) {
  brokerRunManifest = castArray(brokerRunManifest);
  const {emitter, ...scriptRunnerOpts} = opts;
  const notifiers = SR.createScriptRunnerNotifiers(
    (emitter ??
      new EventEmitter()) as Event.StrictEmitter<Event.ScriptRunnerEvents>,
    brokerRunManifest.length,
  );

  let signal: AbortSignal;
  let ac: AbortController | undefined;
  if (!opts.signal) {
    ac = new AbortController();
    signal = ac.signal;
  } else {
    signal = opts.signal;
  }

  try {
    return await Promise.all(
      brokerRunManifest.map((manifest) =>
        scriptRunner(notifiers, manifest, {...scriptRunnerOpts, signal}),
      ),
    );
  } finally {
    ac?.abort();
  }
}
