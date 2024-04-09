import {
  assign,
  fromPromise,
  log,
  sendTo,
  setup,
  type AnyActorRef,
} from 'xstate';
import {
  type PkgManager,
  type RunScriptManifest,
  type RunScriptResult,
} from '../component';
import {fromUnknownError, type ScriptBailed, type ScriptError} from '../error';
import {type PMMWillRunScriptEvent} from './pkg-manager/pkg-manager-machine-events';

export interface SRMInput {
  pkgManager: PkgManager;
  runScriptManifest: RunScriptManifest;
  signal: AbortSignal;

  /**
   * Index of the script in the list of scripts to run _for a particular package
   * manager_.
   */
  index: number;

  parentRef: AnyActorRef;
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
  index: number;
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

type SRMRunScriptInput = Omit<SRMInput, 'index' | 'parentRef'>;

export type SRMOutput = SRMOutputResult | SRMOutputError | SRMOutputBailed;

export const ScriptRunnerMachine = setup({
  types: {
    context: {} as SRMContext,
    input: {} as SRMInput,
    output: {} as SRMOutput,
  },
  actions: {
    sendWillRunScriptEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): PMMWillRunScriptEvent => {
        const {runScriptManifest, index} = context;
        return {
          type: 'WILL_RUN_SCRIPT',
          runScriptManifest,
          index,
        };
      },
    ),
    assignScriptError: assign({
      error: ({context}, {error}: {error?: unknown}) =>
        error ? (fromUnknownError(error) as ScriptError) : context.error,
    }),
  },
  actors: {
    runScript: fromPromise<RunScriptResult, SRMRunScriptInput>(
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
    guard: {type: 'aborted'},
    target: '.aborted',
  },
  initial: 'running',
  context: ({input}) => input,
  states: {
    running: {
      entry: [{type: 'sendWillRunScriptEvent'}],
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
            {
              type: 'assignScriptError',
              params: ({event: {error}}) => ({error}),
            },
          ],
          target: 'errored',
        },
      },
    },
    aborted: {
      entry: [log('aborted')],
      type: 'final',
    },
    errored: {
      entry: [log('errored')],
      type: 'final',
    },
    done: {
      entry: [log('done')],
      type: 'final',
    },
  },
  output: ({
    self: {id},
    context: {runScriptManifest, result, error, bailed, pkgManager, index},
  }): SRMOutput => {
    const base: BaseSRMOutput = {
      id,
      manifest: runScriptManifest,
      pkgManager,
      index,
    };
    if (error) {
      return {...base, error, type: 'ERROR'};
    }
    if (bailed) {
      return {...base, bailed, type: 'BAILED'};
    }
    return {...base, result: result!, type: 'RESULT'};
  },
});
