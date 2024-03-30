import {type InstallManifest} from '#schema/install-manifest';
import Debug from 'debug';
import {uniqBy} from 'lodash';
import {
  and,
  assign,
  fromPromise,
  log,
  not,
  sendParent,
  setup,
  type ActorRefFrom,
} from 'xstate';
import {
  type InstallResult,
  type RunScriptManifest,
  type RunScriptResult,
  type SomePkgManager,
} from '../component';
import {makeId} from './pkgManagerControlMachine';
import {scriptRunnerMachine, type SRMOutput} from './scriptRunnerMachine';
export type PackMachineOpts = {
  allWorkspaces?: boolean;
  includeWorkspaceRoot?: boolean;
  workspaces?: string[];
  timeout?: number;
};

export type PackActorCtx = {pkgManager: SomePkgManager; opts: PackMachineOpts};

export interface PMMInput {
  pkgManager: SomePkgManager;
}

export interface PMMContext extends PMMInput {
  installManifests: InstallManifest[];
  packOpts?: PackMachineOpts;
  installResult?: InstallResult;
  runScriptManifests: RunScriptManifest[];
  abortController: AbortController;
  runScriptResults?: RunScriptResult[];
  scriptRunners: Map<string, ActorRefFrom<typeof scriptRunnerMachine>>;
}

export interface PMMPackEvent {
  type: 'PACK';
  opts?: PackMachineOpts;
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

export type PMMEvents =
  | PMMPackEvent
  | PMMInstallEvent
  | PMMSetupEvent
  | PMMRunScriptsEvent
  | {type: 'xstate.done.actor.scriptRunner.*'; output: SRMOutput};

export const pkgManagerMachine = setup({
  types: {
    context: {} as PMMContext,
    events: {} as PMMEvents,
    input: {} as {pkgManager: SomePkgManager},
    // output: {} as {
    //   installManifests: InstallManifest[];
    // },
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
      Boolean(scriptRunners.size),
  },
  actors: {
    pack: fromPromise<
      InstallManifest[],
      {pkgManager: SomePkgManager; opts?: PackMachineOpts}
    >(async ({input: {pkgManager, opts}}) => pkgManager.pack(opts)),
    setup: fromPromise<void, SomePkgManager>(async ({input: pkgManager}) => {
      await pkgManager.setup();
    }),
    install: fromPromise<
      InstallResult,
      {pkgManager: SomePkgManager; installManifests: InstallManifest[]}
    >(async ({input: {pkgManager, installManifests}}) =>
      pkgManager.install(installManifests),
    ),
    runScripts: fromPromise<
      RunScriptResult[],
      {
        runScriptManifests: RunScriptManifest[];
        pkgManager: SomePkgManager;
        signal: AbortSignal;
      }
    >(async ({input: {runScriptManifests, pkgManager, signal}}) => {
      return Promise.all(
        runScriptManifests.map(async (runScriptManifest) => {
          return pkgManager.runScript(runScriptManifest, signal);
        }),
      );
    }),
    scriptRunner: scriptRunnerMachine,
  },
  actions: {
    eventLogger: log(({event}) => `received evt ${event.type}`),
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
    scriptRunners: new Map(),
  }),
  id: 'PkgManager',
  initial: 'settingUp',
  on: {
    '*': {
      actions: ['eventLogger'],
    },
    PACK: {
      actions: [
        assign({
          packOpts: ({event: {opts = {}}}) => opts,
        }),
      ],
    },
    RUN_SCRIPTS: {
      actions: [
        log('received RUN_SCRIPTS event'),
        assign({
          runScriptManifests: ({context: {pkgManager}, event: {scripts}}) =>
            pkgManager.buildRunScriptManifests(scripts),
        }),
      ],
    },
  },
  states: {
    settingUp: {
      invoke: {
        input: ({context: {pkgManager}}) => pkgManager,
        src: 'setup',
        onDone: {
          target: 'ready',
        },
      },
      exit: log('setup complete'),
    },
    ready: {
      entry: log('ready'),
      on: {
        PACK: {
          actions: [
            assign({
              packOpts: ({event: {opts = {}}}) => opts,
            }),
          ],
          target: 'packing',
        },
      },
      always: {
        target: 'packing',
        guard: 'hasPackOpts',
      },
    },
    packing: {
      entry: log('entering packing'),
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
            log('packed successfully'),
            sendParent(({self, context}) => ({
              type: 'PACKED',
              sender: self.id,
              installManifests: context.installManifests,
            })),
            log(
              ({context: {installManifests}}) =>
                `sent PACKED with ${installManifests.length} install manifests`,
            ),
          ],
        },
      },
    },
    packed: {
      entry: log('in packed state'),
      always: {
        guard: and(['hasInstallManifests', 'uniqueInstallManifests']),
        target: 'installing',
      },
    },
    installing: {
      entry: log('in installing state'),
      invoke: {
        src: 'install',
        input: ({context: {pkgManager, installManifests}}) => ({
          pkgManager,
          installManifests,
        }),
        onDone: {
          target: 'installed',
          actions: [
            log('installed successfully'),
            assign({
              installResult: ({event: {output: installResult}}) =>
                installResult,
            }),
            sendParent(({self, context: {installResult}}) => ({
              type: 'INSTALLED',
              sender: self.id,
              installResult,
            })),
          ],
        },
      },
    },
    installed: {
      entry: log('in installed state'),
      always: {
        guard: 'hasRunScriptManifests',
        target: 'runningScripts',
      },
    },
    runningScripts: {
      entry: [
        log('in runningScripts state'),
        assign({
          scriptRunners: ({
            spawn,
            context: {pkgManager, abortController, runScriptManifests},
          }) =>
            new Map(
              runScriptManifests.map((runScriptManifest) => {
                const id = `scriptRunner.${makeId()}`;
                const actor = spawn('scriptRunner', {
                  input: {
                    pkgManager,
                    runScriptManifest,
                    signal: abortController.signal,
                  },
                  id,
                });
                // @ts-expect-error private field
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                actor.logger = actor._actorScope.logger = Debug(id);
                return [id, actor];
              }),
            ),
        }),
      ],
      on: {
        'xstate.done.actor.scriptRunner.*': {
          guard: 'hasScriptRunners',
          actions: [
            assign({
              scriptRunners: ({
                context: {scriptRunners},
                event: {
                  output: {id},
                },
              }) => {
                scriptRunners.delete(id);
                return scriptRunners;
              },
            }),
            log(
              ({context: {scriptRunners}}) =>
                `${scriptRunners.size} scriptRunners remain`,
            ),
          ],
        },
      },
      always: {
        target: 'done',
        guard: not('hasScriptRunners'),
      },
      // invoke: {
      //   src: 'runScripts',
      //   input: ({
      //     context: {pkgManager, runScriptManifests, abortController},
      //   }) => ({
      //     pkgManager,
      //     runScriptManifests,
      //     signal: abortController.signal,
      //   }),
      //   onDone: {
      //     target: 'done',
      //     actions: [
      //       log('ran scripts'),
      //       assign({
      //         runScriptResults: ({event: {output: runScriptResults}}) =>
      //           runScriptResults,
      //       }),
      //     ],
      //   },
    },
    done: {
      entry: log('done done'),
      type: 'final',
    },
  },
  // output: ({context: {installManifests}}) => ({installManifests}),
});
