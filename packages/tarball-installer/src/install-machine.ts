import {constant, FINAL, InstallEvents} from 'midnight-smoker/constants';
import {
  type InstallManifest,
  type PkgManagerContext,
  type PkgManagerInstallContext,
} from 'midnight-smoker/defs/pkg-manager';
import {type InstallError} from 'midnight-smoker/error';
import {
  type AbortEvent,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
  type MachineEvent,
  type SmokeMachinePkgInstallBeginEvent,
  type SmokeMachinePkgInstallFailedEvent,
  type SmokeMachinePkgInstallOkEvent,
} from 'midnight-smoker/machine';
import {type InstallResult, toWorkspaceInfo} from 'midnight-smoker/pkg-manager';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';
import {
  assert,
  isWorkspaceInstallManifest,
  R,
  toResult,
  uniqueId,
} from 'midnight-smoker/util';
import {type Except} from 'type-fest';
import {
  type ActorRefFromLogic,
  and,
  type DoneActorEvent,
  emit,
  type ErrorActorEvent,
  not,
  setup,
} from 'xstate';
import {assign, enqueueActions, log, raise} from 'xstate/actions';

import {installLogic, type InstallLogicOutput} from './install-logic';

export interface InstallMachineInput {
  ctx: Readonly<PkgManagerContext>;

  envelope: Readonly<PkgManagerEnvelope>;

  manifests?: InstallManifest[];
}

export interface InstallMachineContext
  extends Except<InstallMachineInput, 'manifests', {requireExactProps: true}> {
  aborted: boolean;
  halting?: boolean;
  installActorRef?: ActorRefFromLogic<typeof installLogic>;
  queue: InstallManifest[];
}

export type InstallMachineHaltEvent = MachineEvent<'HALT', {now?: boolean}>;
const INSTALL_MACHINE_CONTEXT_DEFAULTS = constant({
  aborted: false,
  installActorRef: undefined,
  queue: [],
}) satisfies Partial<InstallMachineContext>;

export type InstallMachineInstallEvent = MachineEvent<
  'INSTALL',
  {manifests: InstallManifest[]}
>;

export type InstallMachineEvent =
  | InstallMachineHaltEvent
  | InstallMachineInstallEvent;
type InstallLogicDoneEvent = DoneActorEvent<InstallLogicOutput, 'install.*'>;
type InstallLogicErrorEvent = ErrorActorEvent<InstallError, 'install.*'>;

export type InstallMachineEmitted =
  | SmokeMachinePkgInstallBeginEvent
  | SmokeMachinePkgInstallFailedEvent
  | SmokeMachinePkgInstallOkEvent;

type InternalInstallMachineEvent =
  | AbortEvent
  | InstallLogicDoneEvent
  | InstallLogicErrorEvent;

export const InstallMachine = setup({
  actions: {
    /**
     * Raises an {@link AbortEvent} with an optional reason.
     */
    abort: raise(
      (_, reason?: Error | string) =>
        ({
          reason,
          type: 'ABORT',
        }) as const,
    ),

    /**
     * Sets the {@link InstallMachineContext.aborted} flag to `true`.
     */
    aborted: assign({
      aborted: true,
    }),

    assignHalting: assign({
      halting: true,
    }),

    /**
     * Pulls an {@link InstallManifest} object off of
     * {@link InstallMachineContext.queue the queue}, spawns an install actor and
     * emits a {@link InstallEvents.PkgInstallbegin} event.
     */
    beginInstall: enqueueActions(({context: {ctx, queue}, enqueue}) => {
      const [installManifest] = queue as [InstallManifest];
      const installCtx: PkgManagerInstallContext = {
        ...ctx,
        ...installManifest,
        installManifest,
      };

      // @ts-expect-error - TS limitation
      enqueue({params: installCtx, type: 'spawnInstallActor'});
      // @ts-expect-error - TS limitation
      enqueue({params: installCtx, type: 'emitPkgInstallBegin'});

      enqueue.assign({
        queue: R.drop(queue, 1),
      });
    }),

    /**
     * Destroys a {@link packLogic} actor by ID.
     */
    destroyChild: enqueueActions(({enqueue}, id: string) => {
      enqueue.stopChild(id);
      enqueue.assign({installActorRef: undefined});
    }),

    /**
     * Emits a {@link SmokeMachinePkgInstallBeginEvent} event.
     */
    emitPkgInstallBegin: emit(
      (
        {
          context: {
            envelope: {spec: pkgManager},
          },
          self: {id: sender},
        },
        ctx: PkgManagerInstallContext,
      ): SmokeMachinePkgInstallBeginEvent => ({
        installManifest: ctx.installManifest,
        pkgManager,
        sender,
        type: InstallEvents.PkgInstallBegin,

        workspace: isWorkspaceInstallManifest(ctx.installManifest)
          ? toResult(toWorkspaceInfo(ctx.installManifest))
          : undefined,
      }),
    ),

    /**
     * Emits a {@link SmokeMachinePkgInstallFailedEvent} event.
     */
    emitPkgInstallFailed: emit(
      (
        {
          context: {
            envelope: {spec: pkgManager},
          },
          self: {id: sender},
        },
        error: InstallError,
      ): SmokeMachinePkgInstallFailedEvent => {
        return {
          error,
          installManifest: error.context.installManifest,
          pkgManager,
          sender,
          type: InstallEvents.PkgInstallFailed,

          workspace: isWorkspaceInstallManifest(error.context.installManifest)
            ? toResult(toWorkspaceInfo(error.context.installManifest))
            : undefined,
        };
      },
    ),

    emitPkgInstallOk: emit(
      (
        {
          context: {
            envelope: {spec: pkgManager},
          },
          self: {id: sender},
        },
        {installManifest, rawResult}: InstallResult,
      ) => {
        const evt: SmokeMachinePkgInstallOkEvent = {
          installManifest,
          pkgManager,
          rawResult,
          sender,
          type: InstallEvents.PkgInstallOk,
          workspace: isWorkspaceInstallManifest(installManifest)
            ? toResult(toWorkspaceInfo(installManifest))
            : undefined,
        };
        return evt;
      },
    ),

    /**
     * Enqueues one or more {@link InstallManifest} objects into the
     * {@link InstallMachineContext.queue}
     */
    enqueue: assign({
      queue: ({context: {queue}}, manifests: InstallManifest[]) => [
        ...queue,
        ...manifests,
      ],
    }),

    /**
     * Stops the machine
     */
    halt: ({self}) => {
      self.stop();
    },

    /**
     * For testing
     */
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),

    spawnInstallActor: assign({
      installActorRef: (
        {context: {envelope, installActorRef}, spawn},
        ctx: PkgManagerInstallContext,
      ) => {
        assert.ok(!installActorRef);

        const id = uniqueId({
          prefix: 'install',
          suffix: ctx.installManifest.pkgName,
        });

        const ref = spawn('install', {
          id,
          input: {
            ctx,
            envelope,
          },
        });

        return ref;
      },
    }),
  },
  actors: {
    install: installLogic,
  },
  guards: {
    hasInstallItems: ({context: {installActorRef, queue}}) =>
      !!queue.length && !installActorRef,
    isHalting: ({context: {halting}}) => !!halting,
    shouldHaltNow: (_, {now}: InstallMachineHaltEvent) => !!now,
  },
  types: {
    context: {} as InstallMachineContext,
    emitted: {} as InstallMachineEmitted,
    events: {} as InstallMachineEvent | InternalInstallMachineEvent,
    input: {} as InstallMachineInput,
  },
}).createMachine({
  context: ({input: {manifests = [], ...input}}) => ({
    ...INSTALL_MACHINE_CONTEXT_DEFAULTS,
    ...input,
    queue: manifests,
  }),
  initial: 'running',
  states: {
    done: {
      type: FINAL,
    },
    running: {
      always: [
        {
          actions: [
            log(
              ({context: {queue}, self: {id}}) =>
                `[${id}] Queue contains ${
                  queue.length
                } items; beginning install of "${R.first(queue)!.pkgName}"`,
            ),
            'beginInstall',
          ],
          guard: 'hasInstallItems',
        },
        {
          guard: and(['isHalting', not('hasInstallItems')]),
          target: 'done',
        },
      ],
      entry: [
        INIT_ACTION,
        log(({self: {id}}) => `[${id}] InstallMachine started`),
      ],
      on: {
        ABORT: {
          actions: [
            'aborted',
            log(({event: {reason}, self: {id}}) =>
              reason
                ? `Aborting InstallMachine [${id}]: ${reason}`
                : `Aborting InstallMachine [${id}]`,
            ),
          ],
          target: 'done',
        },
        HALT: [
          {
            description: 'If "now" is true, we should halt immediately',
            guard: {
              params: R.prop('event'),
              type: 'shouldHaltNow',
            },
            target: 'done',
          },
          {
            actions: 'assignHalting',
            description: 'If "now" is falsy, wait until the queue is empty',
          },
        ],
        INSTALL: {
          actions: [
            log(
              ({
                event: {
                  manifests: {length: count},
                  sender,
                },
                self: {id},
              }) =>
                `[${id}] Received INSTALL event from [${sender}]; appending ${count} manifest(s) to queue`,
            ),
            {
              params: R.piped(R.prop('event'), R.prop('manifests')),
              type: 'enqueue',
            },
          ],
        },
        'xstate.done.actor.install.*': {
          actions: [
            {
              /**
               * Provide {@link InstallLogicOutput} to {@link emitPkgInstallOk}
               */
              params: R.piped(R.prop('event'), R.prop('output')),
              type: 'emitPkgInstallOk',
            },
            {
              /**
               * Provide {@link DoneActorEvent.actorId} to {@link destroyChild}
               */
              params: R.piped(R.prop('event'), R.prop('actorId')),
              type: 'destroyChild',
            },
          ],
        },
        'xstate.error.actor.install.*': {
          actions: [
            {
              params: R.piped(R.prop('event'), R.prop('error')),
              type: 'emitPkgInstallFailed',
            },
            {
              params: R.piped(R.prop('event'), R.prop('actorId')),
              type: 'destroyChild',
            },
          ],
        },
      },
    },
  },
});
