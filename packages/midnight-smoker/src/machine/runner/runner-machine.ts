import {
  type CtrlPkgManagerRunScriptsBeginEvent,
  type CtrlRunScriptBeginEvent,
  type CtrlRunScriptFailedEvent,
  type CtrlRunScriptOkEvent,
  type CtrlRunScriptSkippedEvent,
} from '#machine/controller';
import {
  assertActorOutputOk,
  isActorOutputOk,
  makeId,
  monkeypatchActorLogger,
  type ActorOutputOk,
  type MachineOutputLike,
} from '#machine/util';
import {type PkgManager} from '#pkg-manager';
import {type RunScriptManifest, type RunScriptResult} from '#schema';
import {isEmpty} from 'lodash';
import {
  assign,
  enqueueActions,
  log,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import {RunMachine} from './run-machine';
import {type RunMachineOutputOk} from './run-machine-types';
import {
  type RunnerMachineEvents,
  type RunnerMachineRunScriptBeginEvent,
} from './runner-machine-events';

export interface RunnerMachineInput {
  signal: AbortSignal;
  parentRef: AnyActorRef;
  pkgManager: PkgManager;
  index: number;
  runScriptManifests: RunScriptManifest[];
}

export interface RunnerMachineContext extends RunnerMachineInput {
  runMachineRefs: Record<string, ActorRefFrom<typeof RunMachine>>;
  results: RunScriptResult[];
}

export type RunnerMachineOutputOk = ActorOutputOk<{
  manifests: RunScriptManifest[];
  pkgManagerIndex: number;
  results: RunScriptResult[];
  pkgManager: PkgManager;
}>;

/**
 * Output will be used to emit `PKG_MANAGER_RUN_SCRIPTS_OK` or
 * `PKG_MANAGER_RUN_SCRIPTS_FAILED` events.
 */
export type RunnerMachineOutput = RunnerMachineOutputOk;

export const RunnerMachine = setup({
  types: {
    input: {} as RunnerMachineInput,
    context: {} as RunnerMachineContext,
    events: {} as RunnerMachineEvents,
    output: {} as RunnerMachineOutput,
  },
  actors: {
    RunMachine,
  },
  actions: {
    run: assign({
      runMachineRefs: ({
        context: {pkgManager, signal, runScriptManifests, runMachineRefs},
        self,
        spawn,
      }) => ({
        ...runMachineRefs,
        ...Object.fromEntries(
          runScriptManifests.map((manifest, index) => {
            const id = `RunMachine.${makeId()}[${pkgManager.spec}]`;
            const actorRef = spawn('RunMachine', {
              id,
              input: {
                pkgManager,
                signal,
                parentRef: self,
                index: index + 1,
                runScriptManifest: manifest,
              },
            });
            return [id, monkeypatchActorLogger(actorRef, id)];
          }),
        ),
      }),
    }),

    stopRunMachine: enqueueActions(
      ({enqueue, context: {runMachineRefs}}, {id}: MachineOutputLike) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = runMachineRefs;
        enqueue.assign({
          runMachineRefs: rest,
        });
      },
    ),

    assignResult: assign({
      results: ({context}, result: RunScriptResult) => [
        ...context.results,
        result,
      ],
    }),

    sendPkgManagerRunScriptsBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): CtrlPkgManagerRunScriptsBeginEvent => ({
        type: 'PKG_MANAGER_RUN_SCRIPTS_BEGIN',
        pkgManager: context.pkgManager.staticSpec,
        manifests: context.runScriptManifests,
        workspaceInfo: context.runScriptManifests.map(
          ({pkgName, localPath}) => ({pkgName, localPath}),
        ),
        currentPkgManager: context.index,
      }),
    ),

    sendRunScriptBegin: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context},
        {
          type,
          index: scriptIndex,
          runScriptManifest,
        }: RunnerMachineRunScriptBeginEvent,
      ): CtrlRunScriptBeginEvent => ({
        type,
        scriptIndex,
        pkgManagerIndex: context.index,
        pkgManager: context.pkgManager,
        runScriptManifest,
      }),
    ),

    sendRunScriptDone: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context},
        {manifest, scriptIndex, result}: RunMachineOutputOk,
      ):
        | CtrlRunScriptOkEvent
        | CtrlRunScriptFailedEvent
        | CtrlRunScriptSkippedEvent => {
        let type: 'RUN_SCRIPT_OK' | 'RUN_SCRIPT_FAILED' | 'RUN_SCRIPT_SKIPPED' =
          'RUN_SCRIPT_OK';
        if (result.skipped) {
          type = 'RUN_SCRIPT_SKIPPED';
        } else if (result.error) {
          type = 'RUN_SCRIPT_FAILED';
        }

        return {
          type,
          scriptIndex,
          pkgManagerIndex: context.index,
          pkgManager: context.pkgManager,
          runScriptManifest: manifest,
          result,
        };
      },
    ),
  },
  guards: {
    isRunningDone: ({context: {runMachineRefs}}) => isEmpty(runMachineRefs),
  },
}).createMachine({
  context: ({input}) => ({
    ...input,
    runMachineRefs: {},
    results: [],
  }),
  initial: 'running',
  entry: [
    {
      type: 'sendPkgManagerRunScriptsBegin',
    },
  ],
  id: 'RunnerMachine',
  states: {
    running: {
      entry: [
        {
          type: 'run',
        },
      ],
      on: {
        RUN_SCRIPT_BEGIN: {
          actions: [
            {
              type: 'sendRunScriptBegin',
              params: ({event}) => event,
            },
          ],
        },
        'xstate.done.actor.RunMachine.*': {
          actions: [
            {
              type: 'assignResult',
              params: ({event: {output}}) => {
                if (isActorOutputOk(output)) {
                  return output.result;
                }
                return {error: output.error};
              },
            },
            {
              type: 'stopRunMachine',
              params: ({event: {output}}) => output,
            },
            {
              type: 'sendRunScriptDone',
              params: ({event: {output}}) => {
                assertActorOutputOk(output);
                return output;
              },
            },
          ],
        },
      },
      always: [
        {
          guard: {type: 'isRunningDone'},
          target: 'done',
        },
      ],
    },
    done: {
      entry: [log('done')],
      type: 'final',
    },
  },
  output: ({
    self: {id},
    context: {index, pkgManager, results, runScriptManifests},
  }) => ({
    type: 'OK',
    id,
    pkgManager,
    results,
    manifests: runScriptManifests,
    pkgManagerIndex: index,
  }),
});
