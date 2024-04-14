import {fromUnknownError, ScriptBailed} from '#error';
import {type PkgManager} from '#pkg-manager';
import {
  type RunScriptManifest,
  type RunScriptResult,
  type ScriptError,
} from '#schema';
import {
  assign,
  fromPromise,
  log,
  not,
  sendTo,
  setup,
  type AnyActorRef,
} from 'xstate';
import {type MachineOutputError, type MachineOutputOk} from '../machine-util';
import {type RunMachineRunScriptBeginEvent} from './runner-machine-events';

export interface RunMachineInput {
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

export interface RunMachineContext extends RunMachineInput {
  result?: RunScriptResult;
  error?: ScriptError;
}

export interface RunMachineBaseOutput {}

export type RunMachineOutputOk = MachineOutputOk<{
  manifest: RunScriptManifest;
  scriptIndex: number;
  result: RunScriptResult;
}>;

export type RunMachineOutputError = MachineOutputError<ScriptError>;
export type RunMachineOutput = RunMachineOutputOk | RunMachineOutputError;

export type RunMachineRunScriptInput = Omit<
  RunMachineInput,
  'index' | 'parentRef'
>;

export const RunMachine = setup({
  types: {
    context: {} as RunMachineContext,
    input: {} as RunMachineInput,
    output: {} as RunMachineOutput,
  },
  actions: {
    sendRunScriptBeginEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): RunMachineRunScriptBeginEvent => {
        const {runScriptManifest, index} = context;
        return {
          type: 'RUN_SCRIPT_BEGIN',
          runScriptManifest,
          index,
        };
      },
    ),
  },
  actors: {
    runScript: fromPromise<RunScriptResult, RunMachineRunScriptInput>(
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
    isBailed: (_, error: unknown) => error instanceof ScriptBailed,
    isNotBailed: not('isBailed'),
  },
}).createMachine({
  always: {
    guard: {type: 'aborted'},
    target: '.aborted',
  },
  id: 'RunMachine',
  initial: 'running',
  context: ({input}) => input,
  states: {
    running: {
      entry: [{type: 'sendRunScriptBeginEvent'}],
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
        onError: [
          {
            guard: {type: 'isBailed'},
            actions: [
              assign({
                result: {skipped: true},
              }),
            ],
            target: 'aborted',
          },
          {
            guard: {type: 'isNotBailed'},
            actions: [
              assign({
                error: ({event: {error}}) =>
                  fromUnknownError(error) as ScriptError,
              }),
            ],
            target: 'errored',
          },
        ],
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
    context: {runScriptManifest, result, error, index},
  }): RunMachineOutput => {
    if (error) {
      return {
        type: 'ERROR',
        id,
        error,
      };
    }
    return {
      type: 'OK',
      id,
      manifest: runScriptManifest,
      result: result!,
      scriptIndex: index,
    };
  },
});
