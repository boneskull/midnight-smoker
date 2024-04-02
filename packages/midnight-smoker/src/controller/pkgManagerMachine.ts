import {type InstallManifest} from '#schema/install-manifest';
import Debug from 'debug';
import {uniqBy} from 'lodash';
import {
  and,
  assign,
  enqueueActions,
  fromPromise,
  log,
  not,
  sendParent,
  setup,
  type ActorRefFrom,
} from 'xstate';
import {
  type InstallResult,
  type PackOptions,
  type RunScriptManifest,
  type RunScriptResult,
  type SomePkgManager,
} from '../component';
import {fromUnknownError} from '../error';
import {
  makeId,
  type PMCtrlDidRunScriptEvent,
  type PMCtrlInstalledEvent,
  type PMCtrlPackedEvent,
  type PMCtrlWillRunScriptEvent,
} from './pkgManagerControlMachine';
import {
  scriptRunnerMachine,
  type SRMInput,
  type SRMOutput,
} from './scriptRunnerMachine';

export interface PMMInput {
  pkgManager: SomePkgManager;
  packOpts?: PackOptions;

  /**
   * Index of this package manager in the list of loaded package managers.
   */
  index: number;
}

export interface PMMContext extends PMMInput {
  installManifests: InstallManifest[];
  installResult?: InstallResult;
  runScriptManifests: RunScriptManifest[];
  abortController: AbortController;
  scriptRunners: Record<string, ActorRefFrom<typeof scriptRunnerMachine>>;
  scriptResults: Map<RunScriptManifest, SRMOutput>;
  error?: Error;
}

export interface PMMInstallEvent {
  type: 'INSTALL';
}

export interface PMMSetupEvent {
  type: 'SETUP';
}

export interface PMMRunScriptsEvent {
  type: 'RUN_SCRIPTS';
  scripts: string[];
}

export interface PMMScriptRunnerDoneEvent {
  type: 'xstate.done.actor.scriptRunner.*';
  output: SRMOutput;
}

export interface PMMWillRunScriptEvent {
  type: 'WILL_RUN_SCRIPT';
  runScriptManifest: RunScriptManifest;
  index: number;
}

export type PMMEvents =
  | PMMInstallEvent
  | PMMSetupEvent
  | PMMRunScriptsEvent
  | PMMScriptRunnerDoneEvent
  | PMMWillRunScriptEvent;

export const pkgManagerMachine = setup({
  types: {
    context: {} as PMMContext,
    events: {} as PMMEvents,
    input: {} as PMMInput,
    output: {} as {error?: Error},
  },
  guards: {
    uniqueInstallManifests: ({context: {installManifests}}) =>
      uniqBy(installManifests, 'pkgName').length === installManifests.length,
    hasInstallManifests: ({context: {installManifests}}) =>
      installManifests.length > 0,
    hasPackOpts: ({context: {packOpts}}) => Boolean(packOpts),
    hasRunScriptManifests: ({context: {runScriptManifests}}) =>
      Boolean(runScriptManifests?.length),
    hasScriptRunners: ({context: {scriptRunners}}) =>
      Boolean(Object.keys(scriptRunners).length),
    packedSuccessfully: and(['hasInstallManifests', 'uniqueInstallManifests']),
    hasDuplicateInstallManifests: and([
      'hasInstallManifests',
      not('uniqueInstallManifests'),
    ]),
    notHasInstallManifests: not('hasInstallManifests'),
    notHasScriptRunners: not('hasScriptRunners'),
    notHasRunScriptManifests: not('hasRunScriptManifests'),
  },
  actors: {
    pack: fromPromise<
      InstallManifest[],
      {pkgManager: SomePkgManager; opts?: PackOptions}
    >(
      async ({input: {pkgManager, opts}}): Promise<InstallManifest[]> =>
        pkgManager.pack(opts),
    ),
    setup: fromPromise<void, SomePkgManager>(
      async ({input: pkgManager}): Promise<void> => {
        await pkgManager.setup();
      },
    ),
    install: fromPromise<
      InstallResult,
      {pkgManager: SomePkgManager; installManifests: InstallManifest[]}
    >(
      async ({
        input: {pkgManager, installManifests},
      }): Promise<InstallResult> => {
        return pkgManager.install(installManifests);
      },
    ),
    runScripts: fromPromise<
      RunScriptResult[],
      {
        runScriptManifests: RunScriptManifest[];
        pkgManager: SomePkgManager;
        signal: AbortSignal;
      }
    >(async ({input: {runScriptManifests, pkgManager, signal}}) =>
      Promise.all(
        runScriptManifests.map(async (runScriptManifest) =>
          pkgManager.runScript(runScriptManifest, signal),
        ),
      ),
    ),
    scriptRunner: scriptRunnerMachine,
  },
  actions: {
    assignError: assign({
      error: (_, {error}: {error: unknown}) => fromUnknownError(error),
    }),
    createDuplicateInstallManifestsError: assign({
      error: new Error('duplicate install manifests'),
    }),
    createNoInstallManifestsError: assign({
      error: new Error('no install manifests; nothing to do'),
    }),
    eventLogger: log(({event}): string => `received evt ${event.type}`),
    sendDidRunScriptEvent: sendParent(
      (_, {output}: {output: SRMOutput}): PMCtrlDidRunScriptEvent => ({
        type: 'DID_RUN_SCRIPT',
        output,
      }),
    ),
    sendInstalledEvent: sendParent(
      ({self, context: {installResult}}): PMCtrlInstalledEvent => ({
        type: 'INSTALLED',
        sender: self.id,
        installResult: installResult!,
      }),
    ),
    sendPackedEvent: sendParent(
      ({self, context}): PMCtrlPackedEvent => ({
        type: 'PACKED',
        sender: self.id,
        installManifests: context.installManifests,
      }),
    ),
    sendWillRunScriptEvent: sendParent(
      (
        {context: {index: pkgManagerIndex}},
        {type, runScriptManifest, index: scriptIndex}: PMMWillRunScriptEvent,
      ): PMCtrlWillRunScriptEvent => ({
        type,
        runScriptManifest,
        pkgManagerIndex,
        scriptIndex,
      }),
    ),
    spawnScriptRunners: assign({
      scriptRunners: ({
        spawn,
        context: {pkgManager, abortController, runScriptManifests},
      }): PMMContext['scriptRunners'] =>
        Object.fromEntries(
          runScriptManifests.map((runScriptManifest, index) => {
            const id = `scriptRunner.${makeId()}`;
            const input: SRMInput = {
              pkgManager,
              runScriptManifest,
              signal: abortController.signal,
              index: index + 1,
            };
            const actor = spawn('scriptRunner', {
              input,
              id,
            });
            // @ts-expect-error private field
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            actor.logger = actor._actorScope.logger = Debug(id);
            return [id, actor];
          }),
        ),
    }),
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QAUDWUCyBDAdlmATgMQBUA2gAwC6ioADgPawCWALswzrSAB6IBsAFn4A6AOz8ArPwBMkgDQgAnogCMMgL4bFaTLnxgCI2GFbscUAKp0iETmBHMcANwaoHu7HkLHT5q3QITq4AxljsnJRUUdyMLBFcSLyIMqoAHCIyAMyCWWIKyohZqmIiAJwUspJaOuheBkYmZk4BRMgAggDCANIxSXFsHImgfAjZgiKSxXKKKgiqUiLCFGV51dognvo+BGBYEEptXb3UsUyDnNyjkqlLlTOFCFkUpWUyZfxp+TWbdduGIl2+0OfXo5wSV0QgjKpQoWQqVVmKQoE0E70+3w2W28ALoWBCqBatnsjhcbg8fxxRjxBJaQTJYQSUVBIAGEKSozSuSRYwk4jSQkkaSyItFeR+2IaIhp7ggRBZbKGkPmqkEqhE6XyPOm4nhQrFYrEWg2OAYEDg3ElhDO8SVHKhPLEr34KzWEspUqa-msNouw2SCBuPJkaQodyq7r0VMBewOvvZIyKsiWa2Dq3Dckj9R8Mpa8btiYQn3VWseMnymT1woNIqNWI9Ofxsvzl3tCDKaRkmU1BTm5cklbK+pr4vrUalTlgrCwABsZ3n+uCCwH1FlRCH1L2UmkMtkh9Wa3WtEA
   */
  context: ({input}) => ({
    ...input,
    installManifests: [],
    runScriptManifests: [],
    abortController: new AbortController(),
    scriptRunners: {},
    scriptResults: new Map(),
  }),
  id: 'PkgManager',
  initial: 'setup',
  on: {
    '*': {
      actions: [{type: 'eventLogger'}],
    },
    RUN_SCRIPTS: {
      actions: [
        assign({
          runScriptManifests: ({context: {pkgManager}, event: {scripts}}) =>
            pkgManager.buildRunScriptManifests(scripts),
        }),
      ],
    },
  },
  states: {
    setup: {
      invoke: {
        input: ({context: {pkgManager}}) => pkgManager,
        src: 'setup',
        onDone: {
          target: 'packing',
        },
        onError: {
          target: 'errored',
          actions: [
            {type: 'assignError', params: ({event: {error}}) => ({error})},
          ],
        },
      },
      exit: [log('setup complete')],
    },
    packing: {
      entry: [log('packing...')],
      invoke: {
        src: 'pack',
        input: ({context: {pkgManager, packOpts: opts = {}}}) => ({
          pkgManager,
          opts,
        }),
        onDone: {
          target: 'packed',
          actions: [
            assign({
              installManifests: ({event: {output: installManifests}}) =>
                installManifests,
            }),
            {type: 'sendPackedEvent'},
          ],
        },
        onError: {
          target: 'errored',
          actions: [
            {type: 'assignError', params: ({event: {error}}) => ({error})},
          ],
        },
      },
      exit: log(
        ({context: {installManifests}}) =>
          `packed with ${installManifests.length} install manifests`,
      ),
    },
    packed: {
      always: [
        {
          guard: {type: 'packedSuccessfully'},
          target: 'installing',
        },
        {
          guard: {type: 'hasDuplicateInstallManifests'},
          target: 'errored',
          actions: [{type: 'createDuplicateInstallManifestsError'}],
        },
        {
          guard: {type: 'notHasInstallManifests'},
          target: 'errored',
          actions: [{type: 'createNoInstallManifestsError'}],
        },
      ],
    },
    installing: {
      entry: [log('installing...')],
      invoke: {
        src: 'install',
        input: ({context: {pkgManager, installManifests}}) => ({
          pkgManager,
          installManifests,
        }),
        onDone: {
          target: 'installed',
          actions: [
            assign({
              installResult: ({event: {output: installResult}}) =>
                installResult,
            }),
            {type: 'sendInstalledEvent'},
          ],
        },
        onError: {
          target: 'errored',
          actions: [
            {type: 'assignError', params: ({event: {error}}) => ({error})},
          ],
        },
      },
    },
    installed: {
      entry: [log('installed')],
      always: {target: 'ready'},
    },
    ready: {
      entry: [log('ready...')],
      always: {
        guard: {type: 'hasRunScriptManifests'},
        target: 'runningScripts',
      },
    },
    runningScripts: {
      entry: [
        log(
          ({context: {runScriptManifests}}) =>
            `running ${runScriptManifests.length} scripts...`,
        ),
        {type: 'spawnScriptRunners'},
      ],
      on: {
        WILL_RUN_SCRIPT: {
          actions: [
            log(
              ({context, event}) =>
                `index: ${event.index}, pkgManagerIndex: ${context.index}`,
            ),
            {type: 'sendWillRunScriptEvent', params: ({event}) => event},
          ],
        },
        'xstate.done.actor.scriptRunner.*': {
          guard: {type: 'hasScriptRunners'},
          actions: [
            enqueueActions(
              ({
                enqueue,
                context: {scriptRunners, scriptResults},
                event: {output},
              }) => {
                const {id} = output;
                enqueue.stopChild(id);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const {[id]: _, ...rest} = scriptRunners;
                const newScriptResults = new Map(scriptResults).set(
                  output.manifest,
                  output,
                );
                enqueue.assign({
                  scriptRunners: rest,
                  scriptResults: newScriptResults,
                });
              },
            ),
            {
              type: 'sendDidRunScriptEvent',
              params: ({event: {output}}) => ({output}),
            },
            log(
              ({context: {scriptRunners}}) =>
                `${Object.keys(scriptRunners).length} scriptRunners remain`,
            ),
          ],
        },
      },
      always: {
        target: 'ranScripts',
        guard: {type: 'notHasScriptRunners'},
      },
    },
    ranScripts: {
      entry: [log('all scripts were run')],
    },
    done: {
      entry: [log('pm done')],
      type: 'final',
    },
    errored: {
      entry: [log('errored!')],
      type: 'final',
    },
  },
  output: ({context: {error}}) => ({
    error,
  }),
});
