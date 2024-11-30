import {constant} from 'midnight-smoker/constants';
import {
  type PkgManagerContext,
  type PkgManagerPackContext,
  type WorkspaceInstallManifest,
} from 'midnight-smoker/defs/pkg-manager';
import {asValidationError, type SomePackError} from 'midnight-smoker/error';
import {PackEvents} from 'midnight-smoker/event';
import {
  type AbortEvent,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
  type MachineEvent,
  type SmokeMachinePkgPackBeginEvent,
  type SmokeMachinePkgPackFailedEvent,
  type SmokeMachinePkgPackOkEvent,
} from 'midnight-smoker/machine';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';
import {toWorkspaceInfo, type WorkspaceInfo} from 'midnight-smoker/schema';
import {assert, R, toResult, uniqueId} from 'midnight-smoker/util';
import {type Except} from 'type-fest';
import {
  type ActorRefFromLogic,
  type DoneActorEvent,
  type ErrorActorEvent,
  setup,
} from 'xstate';
import {assign, emit, enqueueActions, log, raise} from 'xstate/actions';
import 'xstate/guards';

import {packLogic, type PackLogicOutput} from './pack-logic';

export type PackMachineEmitted =
  | SmokeMachinePkgPackBeginEvent
  | SmokeMachinePkgPackFailedEvent
  | SmokeMachinePkgPackOkEvent;

type PackLogicDoneEvent = DoneActorEvent<PackLogicOutput, 'pack.*'>;
type PackLogicErrorEvent = ErrorActorEvent<SomePackError, 'pack.*'>;

export type PackMachinePackEvent = MachineEvent<
  'PACK',
  {workspaces: WorkspaceInfo[]}
>;

export type PackMachineHaltEvent = MachineEvent<'HALT'>;

export interface PackMachineOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

type InternalPackMachineEvent =
  | AbortEvent
  | PackLogicDoneEvent
  | PackLogicErrorEvent;

export type PackMachineEvent = PackMachineHaltEvent | PackMachinePackEvent;

export interface PackMachineContext
  extends Except<PackMachineInput, 'workspaces', {requireExactProps: true}> {
  aborted?: boolean;
  packActorRefs: Record<string, ActorRefFromLogic<typeof packLogic>>;
  queue: WorkspaceInfo[];
}

export interface PackMachineInput extends PackMachineOptions {
  ctx: Readonly<PkgManagerContext>;
  envelope: Readonly<PkgManagerEnvelope>;

  workspaces?: WorkspaceInfo[];
}

const PACK_MACHINE_CONTEXT_DEFAULTS = constant({
  packActorRefs: {},
}) satisfies Partial<PackMachineContext>;

/**
 * Stateless machine which listens for {@link PackMachinePackEvent} events,
 * invokes {@link packLogic} actors and emits
 * {@link SmokeMachinePkgPackBeginEvent}, then emits
 * {@link SmokeMachinePkgPackFailedEvent} or {@link SmokeMachinePkgPackOkEvent}
 * events based on the result.
 */
export const PackMachine = setup({
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

    aborted: assign({
      aborted: true,
    }),

    /**
     * Spawns a {@link packLogic} actor with the first
     * {@link PkgManagerPackContext} item in the queue, invokes
     * {@link emitPkgPackBegin}, and shifts the item from the head of the queue.
     *
     * We do this in one place so we can ensure that the queue is shifted
     * properly.
     */
    beginPack: enqueueActions(({context: {ctx, queue}, enqueue}) => {
      const [workspace] = queue;
      assert.ok(workspace, 'Expected a WorkspaceInfo object');

      const packCtx: PkgManagerPackContext = {...ctx, ...workspace};
      // @ts-expect-error - TS limitation
      enqueue({params: packCtx, type: 'spawnPackActor'});
      // @ts-expect-error - TS limitation
      enqueue({params: packCtx, type: 'emitPkgPackBegin'});

      enqueue.assign({
        queue: R.drop(queue, 1),
      });
    }),

    /**
     * Destroys all children; for use when aborting.
     *
     * Does not assume we're holding references to any children
     */
    destroyAllChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      for (const child of Object.keys(snapshot.children)) {
        enqueue.stopChild(child);
      }
    }),

    /**
     * Destroys a {@link packLogic} actor by ID.
     */
    destroyChild: enqueueActions(
      ({context: {packActorRefs = {}}, enqueue}, id: string) => {
        enqueue.stopChild(id);
        enqueue.assign({packActorRefs: R.omit(packActorRefs, [id])});
      },
    ),

    /**
     * Emits a {@link SmokeMachinePkgPackBeginEvent} event.
     */
    emitPkgPackBegin: emit(
      (
        {context: {envelope}, self: {id: sender}},
        ctx: PkgManagerPackContext,
      ): SmokeMachinePkgPackBeginEvent => ({
        pkgManager: envelope.spec,
        sender,
        type: PackEvents.PkgPackBegin,
        workspace: toResult(ctx),
      }),
    ),

    /**
     * Emits a {@link SmokeMachinePkgPackFailedEvent} event.
     */
    emitPkgPackFailed: emit(
      (
        {
          context: {
            envelope: {spec: pkgManager},
          },
          self: {id: sender},
        },
        error: SomePackError,
      ): SmokeMachinePkgPackFailedEvent => ({
        error,
        pkgManager,
        sender,
        type: PackEvents.PkgPackFailed,
        workspace: toResult(error.context.workspace),
      }),
    ),

    /**
     * Emits a {@link SmokeMachinePkgPackOkEvent} event.
     *
     * This would normally be an {@link emit}, but we are parsing an object with
     * Zod, which likes to throw exceptions. So in the case that we cannot
     * extract a {@link WorkspaceInfo}, we will abort.
     *
     * `installManifest` is guaranteed per the guard.
     */
    emitPkgPackOk: enqueueActions(
      (
        {
          context: {
            envelope: {spec: pkgManager},
          },
          enqueue,
          self: {id: sender},
        },
        installManifest?: WorkspaceInstallManifest,
      ) => {
        // note: InstallManifest is a superset of WorkspaceInfo;
        // this will just strip out fields
        try {
          const workspace = toWorkspaceInfo(installManifest!);
          const evt: SmokeMachinePkgPackOkEvent = {
            installManifest: toResult(installManifest!),
            pkgManager,
            sender,
            type: PackEvents.PkgPackOk,
            workspace: toResult(workspace),
          };
          enqueue.emit(evt);
        } catch (err) {
          // this "should never happen"
          // @ts-expect-error - TS limitation
          enqueue({params: asValidationError(err), type: 'abort'});
        }
      },
    ),

    /**
     * Enqueues one or more {@link PkgManagerPackContext} objects into the
     * {@link PackMachineContext.queue}
     */
    enqueue: assign({
      queue: ({context: {queue}}, workspaces: WorkspaceInfo[]) => [
        ...queue,
        ...workspaces,
      ],
    }),

    halt: ({self}) => {
      self.stop();
    },

    /**
     * For testing
     */
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),

    /**
     * Spawns a {@link packLogic} actor with the given
     * {@link PkgManagerPackContext}.
     *
     * Stores a reference to the spawned actor in
     * {@link PackMachineContext.packActorRefs}
     */
    spawnPackActor: assign({
      packActorRefs: (
        {context: {envelope, packActorRefs = {}}, spawn},
        ctx: PkgManagerPackContext,
      ) => {
        const id = uniqueId({prefix: 'pack', suffix: ctx.pkgName});
        const ref = spawn('pack', {
          id,
          input: {
            ctx,
            envelope,
          },
        });
        return {...packActorRefs, [id]: ref};
      },
    }),
  },
  actors: {
    pack: packLogic,
  },
  types: {
    context: {} as PackMachineContext,
    emitted: {} as PackMachineEmitted,
    events: {} as InternalPackMachineEvent | PackMachineEvent,
    input: {} as PackMachineInput,
  },
}).createMachine({
  always: [
    {
      actions: 'beginPack',

      /**
       * {@link PackMachineContext.queue} must have at least one item
       */
      guard: R.piped(R.prop('context'), R.prop('queue'), R.hasAtLeast(1)),
    },
  ],

  /**
   * Merge {@link PackMachineInput} with {@link PACK_MACHINE_CONTEXT_DEFAULTS} and
   * add workspaces (if any) to the queue
   */
  context: ({input: {workspaces = [], ...input}}) => ({
    ...PACK_MACHINE_CONTEXT_DEFAULTS,
    ...input,
    queue: workspaces,
  }),

  entry: [INIT_ACTION, log(({self: {id}}) => `[${id}] PackMachine started`)],
  on: {
    ABORT: {
      actions: [
        'aborted',
        log(({event: {reason}, self: {id}}) =>
          reason
            ? `Aborting PackMachine [${id}]: ${reason}`
            : `Aborting PackMachine [${id}]`,
        ),
        'destroyAllChildren',
        'halt',
      ],
    },
    PACK: {
      actions: {
        /**
         * Enqueue all {@link PackMachinePackEvent.workspaces}
         */
        params: R.piped(R.prop('event'), R.prop('workspaces')),
        type: 'enqueue',
      },
    },
    'xstate.done.actor.pack.*': [
      {
        actions: [
          {
            /**
             * Provide {@link PackLogicOutput} to {@link emitPkgPackOk}
             */
            params: R.piped(R.prop('event'), R.prop('output')),
            type: 'emitPkgPackOk',
          },
          {
            /**
             * Provide {@link DoneActorEvent.actorId} to {@link destroyChild}
             */
            params: R.piped(R.prop('event'), R.prop('actorId')),
            type: 'destroyChild',
          },
        ],
        // TODO: rewrite as provided guard
        guard: R.piped(R.prop('event'), R.prop('output'), R.isTruthy),
      },
      {
        actions: {
          params: 'Packing aborted because pack logic was explicitly stopped',
          type: 'abort',
        },
        // TODO: rewrite as provided guard
        guard: R.piped(
          R.prop('context'),
          R.prop('aborted'),
          R.isNot(R.isTruthy),
        ),
      },
    ],
    'xstate.error.actor.pack.*': {
      actions: [
        {
          /**
           * Provide the {@link SomePackError} to {@link emitPkgPackFailed}
           */
          params: R.piped(R.prop('event'), R.prop('error')),
          type: 'emitPkgPackFailed',
        },
        {
          /**
           * Provide {@link ErrorActorEvent.actorId} to {@link destroyChild}
           */
          params: R.piped(R.prop('event'), R.prop('actorId')),
          type: 'destroyChild',
        },
      ],
    },
  },
});