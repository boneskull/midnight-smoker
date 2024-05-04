import {ScriptBailed} from '#error';
import {type RunScriptResult, type ScriptError} from '#schema';
import assert from 'node:assert';
import {assign, fromPromise, log, not, sendTo, setup} from 'xstate';
import {
  type RunMachineContext,
  type RunMachineInput,
  type RunMachineOutput,
  type RunMachineRunScriptInput,
} from './run-machine-types';
import {type RunnerMachineRunScriptBeginEvent} from './runner-machine-events';

export const RunMachine = setup({
  types: {
    context: {} as RunMachineContext,
    input: {} as RunMachineInput,
    output: {} as RunMachineOutput,
  },
  actions: {
    sendRunScriptBeginEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): RunnerMachineRunScriptBeginEvent => {
        const {runScriptManifest, index} = context;
        return {
          type: 'RUN_SCRIPT_BEGIN',
          runScriptManifest,
          index,
        };
      },
    ),
    assignResult: assign({
      result: (_, result: RunScriptResult) => result,
    }),
    assignError: assign({
      error: (_, error: ScriptError) => error,
    }),
  },
  actors: {
    runScript: fromPromise<RunScriptResult, RunMachineRunScriptInput>(
      async ({input: {pkgManager, runScriptManifest, signal}}) =>
        pkgManager.runScript(runScriptManifest, signal),
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
            {
              type: 'assignResult',
              params: ({event: {output: result}}) => result,
            },
          ],
          target: 'done',
        },
        onError: [
          {
            guard: {type: 'isBailed'},
            actions: [
              {
                type: 'assignResult',
                params: {skipped: true},
              },
            ],
            target: 'aborted',
          },
          {
            guard: {type: 'isNotBailed'},
            actions: [
              {
                type: 'assignError',
                params: ({event: {error}}) => error as ScriptError,
              },
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
    assert.ok(result);
    return {
      type: 'OK',
      id,
      manifest: runScriptManifest,
      result,
      scriptIndex: index,
    };
  },
});
