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

export type SRMOutput =
  | {
      id: string;
      result: RunScriptResult;
    }
  | {
      id: string;
      error: ScriptError;
    }
  | {
      id: string;
      bailed: ScriptBailed;
    };

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
  output: ({self: {id}, context: {result, error, bailed}}) => {
    if (error) {
      return {error, id};
    }
    if (bailed) {
      return {bailed, id};
    }
    return {result: result!, id};
  },
});
