import {
  InstallError,
  fromUnknownError,
  type PackError,
  type PackParseError,
} from '#error';
import type {PkgManager} from '#pkg-manager';
import {
  type InstallManifest,
  type InstallResult,
  type PackOptions,
  type RunScriptManifest,
} from '#schema';
import {isSmokerError} from '#util';
import Debug from 'debug';
import {uniqBy} from 'lodash';
import {
  and,
  assign,
  enqueueActions,
  log,
  not,
  sendTo,
  setup,
  type ActorRefFrom,
  type AnyActorRef,
} from 'xstate';
import type * as CtrlEvent from '../controller/control-machine-events';
import {
  makeId,
  type MachineOutputError,
  type MachineOutputOk,
} from '../machine-util';
import type * as ScriptEvent from '../script-runner-machine';
import {
  install,
  pack,
  runScripts,
  scriptRunner,
  setupPkgManager,
  teardownPkgManager,
} from './pkg-manager-machine-actors';
import {
  type PMMEvents,
  type PMMWillRunScriptEvent,
} from './pkg-manager-machine-events';

export interface PMMInput {
  pkgManager: PkgManager;
  packOptions?: PackOptions;

  /**
   * Index of this package manager in the list of loaded package managers.
   */
  index: number;

  parentRef: AnyActorRef;
}

export interface PMMContext extends PMMInput {
  installManifests: InstallManifest[];
  installResult?: InstallResult;
  runScriptManifests: RunScriptManifest[];
  abortController: AbortController;
  scriptRunners: Record<string, ActorRefFrom<typeof scriptRunner>>;
  error?: Error;
  setupComplete: boolean;
}

export type PMMOutputOk = MachineOutputOk;
export type PMMOutputError = MachineOutputError;

export type PMMOutput = PMMOutputOk | PMMOutputError;

export const PkgManagerMachine = setup({
  types: {
    context: {} as PMMContext,
    events: {} as PMMEvents,
    input: {} as PMMInput,
    output: {} as PMMOutput,
  },
  guards: {
    didCompleteSetup: ({context: {setupComplete}}) => setupComplete,
    didNotCompleteSetup: not('didCompleteSetup'),
    uniqueInstallManifests: ({context: {installManifests}}) =>
      uniqBy(installManifests, 'pkgName').length === installManifests.length,
    hasInstallManifests: ({context: {installManifests}}) =>
      installManifests.length > 0,
    hasPackOpts: ({context: {packOptions: packOpts}}) => Boolean(packOpts),
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
    scriptErrored: (_, {output}: {output: ScriptEvent.SRMOutput}) =>
      output.type === 'ERROR',
    scriptCompleted: (_, {output}: {output: ScriptEvent.SRMOutput}) =>
      output.type === 'RESULT',
    scriptBailed: (_, {output}: {output: ScriptEvent.SRMOutput}) =>
      output.type === 'BAILED',
  },
  actors: {
    scriptRunner,
    pack,
    install,
    setupPkgManager,
    teardownPkgManager,
    runScripts,
  },
  actions: {
    updateScriptRunners: enqueueActions(
      (
        {enqueue, context: {scriptRunners}},
        {output: {id}}: {output: ScriptEvent.SRMOutput},
      ) => {
        enqueue.stopChild(id);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {[id]: _, ...rest} = scriptRunners;
        enqueue.assign({
          scriptRunners: rest,
        });
      },
    ),
    assignError: assign({
      error: (_, {error}: {error: unknown}) => fromUnknownError(error),
    }),
    createDuplicateInstallManifestsError: assign({
      error: new Error('duplicate install manifests'),
    }),
    createNoInstallManifestsError: assign({
      error: new Error('no install manifests; nothing to do'),
    }),
    assignInstallManifests: assign({
      installManifests: (_, installManifests: InstallManifest[]) =>
        installManifests,
    }),
    assignInstallResult: assign({
      installResult: (_, installResult: InstallResult) => installResult,
    }),
    assignRunScriptManifests: assign({
      runScriptManifests: ({context: {pkgManager}}, scripts: string[]) =>
        pkgManager.buildRunScriptManifests(scripts),
    }),
    sendDidRunScriptsEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (): CtrlEvent.CtrlDidRunScriptsEvent => ({
        type: 'DID_RUN_SCRIPTS',
      }),
    ),
    sendDidRunScriptResultEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        _,
        {output}: {output: ScriptEvent.SRMOutputResult},
      ): CtrlEvent.CtrlDidRunScriptResultEvent => ({
        type: 'DID_RUN_SCRIPT_RESULT',
        output,
      }),
    ),
    sendDidRunScriptErrorEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        _,
        {output}: {output: ScriptEvent.SRMOutputError},
      ): CtrlEvent.CtrlDidRunScriptErrorEvent => ({
        type: 'DID_RUN_SCRIPT_ERROR',
        output,
      }),
    ),
    sendDidRunScriptBailedEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        _,
        {output}: {output: ScriptEvent.SRMOutputBailed},
      ): CtrlEvent.CtrlDidRunScriptBailedEvent => ({
        type: 'DID_RUN_SCRIPT_BAILED',
        output,
      }),
    ),
    sendWillInstallEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): CtrlEvent.CtrlPkgManagerWillInstallEvent => {
        const {index, pkgManager} = context;
        return {
          type: 'PKG_MANAGER_INSTALL',
          pkgManager: pkgManager.staticSpec,
          index,
        };
      },
    ),
    sendWillPackEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({context}): CtrlEvent.CtrlPkgManagerWillPackEvent => {
        const {packOptions, index, pkgManager} = context;
        return {
          index,
          pkgManager: pkgManager.staticSpec,
          type: 'PKG_MANAGER_PACK',
          ...packOptions,
        };
      },
    ),

    sendInstallOkEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({
        self: {id: sender},
        context,
      }): CtrlEvent.CtrlPkgManagerInstallOkEvent => {
        const {pkgManager, installResult, index} = context;
        return {
          index,
          type: 'PKG_MANAGER_INSTALL_OK',
          pkgManager: pkgManager.staticSpec,
          installResult: installResult!,
          sender,
        };
      },
    ),

    sendInstallFailedEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context},
        {error}: {error: InstallError},
      ): CtrlEvent.CtrlPkgManagerInstallFailedEvent => {
        const {index, pkgManager} = context;
        return {
          index,
          type: 'PKG_MANAGER_INSTALL_FAILED',
          pkgManager: pkgManager.staticSpec,
          error,
          sender,
        };
      },
    ),
    sendPkgManagerPackOkEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      ({self: {id: sender}, context}): CtrlEvent.CtrlPkgManagerPackOkEvent => {
        const {index, pkgManager, installManifests} = context;
        return {
          type: 'PKG_MANAGER_PACK_OK',
          index,
          pkgManager: pkgManager.staticSpec,
          installManifests,
          sender,
        };
      },
    ),
    sendPkgManagerPackFailedEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {self: {id: sender}, context},
        {error}: {error: PackError | PackParseError},
      ): CtrlEvent.CtrlPkgManagerPackFailedEvent => {
        const {index, pkgManager} = context;
        return {
          type: 'PKG_MANAGER_PACK_FAILED',
          error,
          index,
          pkgManager: pkgManager.staticSpec,
          sender,
        };
      },
    ),
    sendWillRunScriptEvent: sendTo(
      ({context: {parentRef}}) => parentRef,
      (
        {context},
        {type, runScriptManifest, index: scriptIndex}: PMMWillRunScriptEvent,
      ): CtrlEvent.CtrlWillRunScriptEvent => {
        const {index: pkgManagerIndex} = context;
        return {
          type,
          runScriptManifest,
          pkgManagerIndex,
          scriptIndex,
        };
      },
    ),
    setupComplete: assign({
      setupComplete: true,
    }),
    spawnScriptRunners: assign({
      scriptRunners: ({
        self,
        spawn,
        context: {pkgManager, abortController, runScriptManifests},
      }) =>
        Object.fromEntries(
          runScriptManifests.map((runScriptManifest, index) => {
            const id = `scriptRunner.${makeId()}`;
            const actor = spawn('scriptRunner', {
              input: {
                pkgManager,
                runScriptManifest,
                signal: abortController.signal,
                index: index + 1,
                parentRef: self,
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
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QAUDWUCyBDAdlmATgMQBKAqgHID6AygMIkCSyAKjQNoAMAuoqAA4B7WAEsALiME4+IAB6IAjABYATAoB0yzkoUA2fUoDMnFQA4ANCACeilQF87ltJlz4wBdbDBiArvyIQUmDqIjgAboKowc7YeISe3n4IoREAxlgSUlzc2TJCopnSSHKIaobqKoZGKrqcCnq6pjWWNggKnIblnLoA7D36ugCcdQoArA5O6LFuHl6+-u4Egh78ADYZAGbLALbqMa7xc0kpgumF2bnF+eKSRaDyCGUVVYY1I-pNui2Ipkqc6qNBgozLVBoYeoCFBMQPs4u51PwsKlUKEoAEgiFwpFolMDvDEcjUcksWdbhceHlhDcpDIHqMVP9TMCakpAUpBoNdIZvm16qN1KpWZVTJwmiKlNDYTMEUiUTg0Ytlgj1mItgRdlL4gS5VBiWkMmSeJcBFTCrTEPTGczdKzBuzOdzrIhBqYegKVEouZ7TA7RlDHDDcXCVrLIERjSBrmbig8eipBpoIeCOh1PY0eSKVOpOEDDKM4yo-XbDJKg9LtWH2ApeFdTbdzW1tFmTENXiKqr0efVOG7ep72sNlEYJQHNfjQxBwyoayaCvWYz96upXayfZxRh30062ioGcvRqp8+0FIYuf7Ji5g5jYGIsKtVqj0Thgiconsy-FQje7w-5XrTgaWRGhStZzjSC47k06ickySh9Byp4KDyuiAhUoqnko7L5toPSlpe0pfre96PoqKwqmqGofvChE-kSJykkBOQgbO1J3CUkFZjByjwWCuhIdufSmOofFwXBhhMoMoyinh0yfjg373pWzGRnW4H3IoNpZpU4mcHUUk+qYFjbkM-J6HoxgMr8yjjKOVEeAQYBYBAVjhspUbzupbQ+roFScsOPQdEMnLIZJ0H1HBCg9ECfycjJeL2T4OA4KiNCpAQIj8GIsBEAA6owAAy+VUOQ1D0EwrARu5ansbuRjZqYB5-HUEL0jyB4Jr0CjDKoKGemYcVXgQiXJfKqXpZl2WyN+YjBIEz7qEiYhKrAaUZWIJDDfCABUlWqWxDxlD5npNh0agbv0PKqG6NSjL8mE+vSkm4bZ+HxENSUpatE1EFNt4zeoc3BIty1fetm0eDt1aUmB+2lMCSjZruPpwZU8NKDyxgIw1do9Dooy3T6z0XrJ8LvSNUBjWtk3TbNGLA7MoMbUl23sNO0OsQ2ag5tBHJSXxkk5ioXZQayhjtOJu4ei6JYvSTCUfaNoPZbtMOc7dHWuiY4L46eDU8j0YzqG29QenxKgFg4AY4IIEBwDIY4EOz0aeQAtPxrR2tBG7dEorrHh0NnE-FCTzE7HnsXBGaYQKIzdHxrw9K8A3lrKqJh9VDx5gmoy6MKgx9EMUXo9uLpZjnPRNL767lzLQdXhWEDp7DCABQjnXnRX9Qno6rR8v84L9H8fq-IYHLJ3JCm-lATcNl3-KAq8LqgrdChGa0vQ+R67I6Dd-RguP1HyURqyQDPEHKKY5Qsvneg+u0xfrwFwl8fmkkdieB-2Y5zln55kXgkbc2tRc46G6j0ZCT99BjCihufstdAyvVJsNT640sq-xqrucokVBiVHupyeoEC3Q9iaLjQEQITBEwQXLdQBBcCUwmugg6UU3RRRQt0U68YhbGT6NmTuXVXgmG3p-AGQRGEWn+Fyc2vs+jslPAbUY+tTwx24r7So1dKEO3UKRU+oEObn19lfG0N9GjkIfs6X4yiGSS1xkyGWDggA
   */
  context: ({input}) => ({
    ...input,
    installManifests: [],
    runScriptManifests: [],
    abortController: new AbortController(),
    scriptRunners: {},
    setupComplete: false,
  }),
  initial: 'setup',
  on: {
    RUN_SCRIPTS: {
      actions: [
        {
          type: 'assignRunScriptManifests',
          params: ({event: {scripts}}) => scripts,
        },
      ],
    },
    HALT: [
      {guard: {type: 'didCompleteSetup'}, target: '.cleanup'},
      {guard: {type: 'didNotCompleteSetup'}, target: '.done'},
    ],
  },
  states: {
    cleanup: {
      entry: [log('cleaning up...')],
      invoke: {
        src: 'teardownPkgManager',
        input: ({context: {pkgManager}}) => pkgManager,
        onDone: {
          target: 'done',
        },
      },
    },
    setup: {
      invoke: {
        input: ({context: {pkgManager}}) => pkgManager,
        src: 'setupPkgManager',
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
      exit: [log('setup complete'), {type: 'setupComplete'}],
    },
    packing: {
      entry: [log('packing...'), {type: 'sendWillPackEvent'}],
      invoke: {
        src: 'pack',
        input: ({
          context: {pkgManager, abortController, packOptions: opts = {}},
        }) => ({
          pkgManager,
          opts,
          signal: abortController.signal,
        }),
        onDone: {
          target: 'packed',
          actions: [
            {
              type: 'assignInstallManifests',
              params: ({event: {output: installManifests}}) => installManifests,
            },
            {type: 'sendPkgManagerPackOkEvent'},
            log(
              ({context: {installManifests}}) =>
                `packed with ${installManifests.length} install manifests`,
            ),
          ],
        },
        onError: {
          target: 'errored',
          actions: [
            {type: 'assignError', params: ({event: {error}}) => ({error})},
            {
              type: 'sendPkgManagerPackFailedEvent',
              params: ({event: {error}}) => ({
                error: error as PackError | PackParseError,
              }),
            },
          ],
        },
      },
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
      entry: [log('installing...'), {type: 'sendWillInstallEvent'}],
      invoke: {
        src: 'install',
        input: ({
          context: {abortController, pkgManager, installManifests},
        }) => ({
          pkgManager,
          installManifests,
          signal: abortController.signal,
        }),
        onDone: {
          target: 'installed',
          actions: [
            {
              type: 'assignInstallResult',
              params: ({event: {output: installResult}}) => installResult,
            },
            {type: 'sendInstallOkEvent'},
          ],
        },
        onError: [
          {
            guard: ({event: {error}}) => isSmokerError(InstallError, error),
            actions: [
              {
                type: 'sendInstallFailedEvent',
                params: ({event: {error}}) => ({error: error as InstallError}),
              },
            ],
          },
          {
            target: 'errored',
            actions: [
              {type: 'assignError', params: ({event: {error}}) => ({error})},
            ],
          },
        ],
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
        'xstate.done.actor.scriptRunner.*': [
          {
            guard: {type: 'scriptErrored', params: ({event}) => event},
            actions: [
              {type: 'updateScriptRunners', params: ({event}) => event},
              {
                type: 'sendDidRunScriptErrorEvent',
                params: ({event}) =>
                  event as {output: ScriptEvent.SRMOutputError},
              },
            ],
          },
          {
            guard: {type: 'scriptBailed', params: ({event}) => event},
            actions: [
              {type: 'updateScriptRunners', params: ({event}) => event},
              {
                type: 'sendDidRunScriptBailedEvent',
                params: ({event}) =>
                  event as {output: ScriptEvent.SRMOutputBailed},
              },
            ],
          },
          {
            guard: {type: 'scriptCompleted', params: ({event}) => event},
            actions: [
              {type: 'updateScriptRunners', params: ({event}) => event},
              {
                type: 'sendDidRunScriptResultEvent',
                params: ({event}) =>
                  event as {output: ScriptEvent.SRMOutputResult},
              },
            ],
          },
        ],
      },
      always: {
        target: 'ranScripts',
        guard: {type: 'notHasScriptRunners'},
      },
    },
    ranScripts: {
      entry: [log('all scripts were run'), {type: 'sendDidRunScriptsEvent'}],
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
  output: ({self: {id}, context: {error}}): PMMOutput =>
    error ? {type: 'ERROR', error, id} : {type: 'OK', id},
});
