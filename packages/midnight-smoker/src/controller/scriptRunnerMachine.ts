import {assign, fromPromise, log, setup} from 'xstate';
import {
  type PkgManager,
  type RunScriptManifest,
  type RunScriptResult,
} from '../component';
import {type ScriptBailed, type ScriptError} from '../error';

export interface SRMInput {
  pkgManager: PkgManager;
  runScriptManifest: RunScriptManifest;
  signal: AbortSignal;
}

export interface SRMContext extends SRMInput {
  result?: RunScriptResult;
  bailed?: ScriptBailed;
  error?: ScriptError;
}

export interface BaseSRMOutput {
  id: string;
  manifest: RunScriptManifest;
  pkgManager: PkgManager;
}

export interface SRMOutputResult extends BaseSRMOutput {
  type: 'RESULT';
  result: RunScriptResult;
}

export interface SRMOutputError extends BaseSRMOutput {
  type: 'ERROR';
  error: ScriptError;
}

export interface SRMOutputBailed extends BaseSRMOutput {
  type: 'BAILED';
  bailed: ScriptBailed;
}

export type SRMOutput = SRMOutputResult | SRMOutputError | SRMOutputBailed;

export const scriptRunnerMachine = setup({
  types: {
    context: {} as SRMContext,
    input: {} as SRMInput,
    output: {} as SRMOutput,
  },
  actors: {
    runScript: fromPromise<RunScriptResult, SRMInput>(
      async ({input: {pkgManager, runScriptManifest, signal}}) =>
        pkgManager.def.runScript({
          ...pkgManager.ctx,
          runScriptManifest,
          signal,
        }),
    ),
  },
  guards: {
    aborted: ({context: {signal}}) => signal.aborted,
    failed: ({context: {result}}) =>
      Boolean(result && 'error' in result && result.error),
    skipped: ({context: {result}}) =>
      Boolean(result && 'skipped' in result && result.skipped),
    hasResult: ({context: {result}}) => Boolean(result),
  },
}).createMachine({
  always: {
    guard: 'aborted',
    target: '.aborted',
  },
  initial: 'running',
  context: ({input}) => input,
  states: {
    running: {
      invoke: {
        src: 'runScript',
        input: ({context: {pkgManager, runScriptManifest, signal}}) => ({
          pkgManager,
          runScriptManifest,
          signal,
        }),
        onDone: {
          actions: [
            assign({
              result: ({event: {output: result}}) => result,
            }),
          ],
          target: 'done',
        },
        onError: {
          actions: [
            assign({
              error: ({event: {error}}) => error as ScriptError,
            }),
          ],
          target: 'errored',
        },
      },
    },
    aborted: {
      type: 'final',
      entry: log('aborted'),
    },
    errored: {
      type: 'final',
      entry: log('errored'),
    },
    done: {
      guard: 'hasResult',
      type: 'final',
      entry: log('done'),
    },
  },
  output: ({
    self: {id},
    context: {runScriptManifest, result, error, bailed, pkgManager},
  }) => {
    const base: BaseSRMOutput = {id, manifest: runScriptManifest, pkgManager};
    if (error) {
      return {...base, error, type: 'ERROR'};
    }
    if (bailed) {
      return {...base, bailed, type: 'BAILED'};
    }
    return {...base, result: result!, type: 'RESULT'};
  },
});
