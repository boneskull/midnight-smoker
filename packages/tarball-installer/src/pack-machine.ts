import {constant} from 'midnight-smoker/constants';
import {
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
import {type WorkspaceInfo, WorkspaceInfoSchema} from 'midnight-smoker/schema';
import {asResult, assert, R, uniqueId} from 'midnight-smoker/util';
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
  {contexts: PkgManagerPackContext[]}
>;

type InternalPackMachineEvents =
  | AbortEvent
  | PackLogicDoneEvent
  | PackLogicErrorEvent;

export type PackMachineEvents = PackMachinePackEvent;

export interface PackMachineContext extends PackMachineInput {
  packActorRefs: Record<string, ActorRefFromLogic<typeof packLogic>>;
  queue: PkgManagerPackContext[];
}

export interface PackMachineInput {
  envelope: PkgManagerEnvelope;
}

const PACK_MACHINE_CONTEXT_DEFAULTS = constant({
  packActorRefs: {},
  queue: [],
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

    /**
     * Spawns a {@link packLogic} actor with the first
     * {@link PkgManagerPackContext} item in the queue, invokes
     * {@link emitPkgPackBegin}, and shifts the item from the head of the queue.
     * If items remain in the queue, it invokes itself recursively.
     *
     * We do this in one place so we can ensure that the queue is shifted
     * properly.
     */
    beginPack: enqueueActions(({context: {queue}, enqueue}) => {
      const [ctx] = queue;
      assert.ok(ctx, 'Expected a PkgManagerPackContext');
      // @ts-expect-error - TS limitation
      enqueue({params: ctx, type: 'spawnPackActor'});
      // @ts-expect-error - TS limitation
      enqueue({params: ctx, type: 'emitPkgPackBegin'});

      enqueue.assign({
        queue: R.drop(queue, 1),
      });

      if (queue.length) {
        // @ts-expect-error - TS limitation
        enqueue({type: 'beginPack'});
      }
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
        workspace: asResult(ctx),
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
        workspace: asResult(error.context.workspace),
      }),
    ),

    /**
     * Emits a {@link SmokeMachinePkgPackOkEvent} event.
     *
     * This would normally be an {@link emit}, but we are parsing an object with
     * Zod, which likes to throw exceptions. So in the case that we cannot
     * extract a {@link WorkspaceInfo}, we will abort.
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
        installManifest: WorkspaceInstallManifest,
      ) => {
        // note: InstallManifest is a superset of WorkspaceInfo;
        // this will just strip out fields
        try {
          const workspace: WorkspaceInfo =
            WorkspaceInfoSchema.parse(installManifest);
          const evt: SmokeMachinePkgPackOkEvent = {
            installManifest: asResult(installManifest),
            pkgManager,
            sender,
            type: PackEvents.PkgPackOk,
            workspace: asResult(workspace),
          };
          enqueue.emit(evt);
        } catch (err) {
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
      queue: ({context: {queue}}, contexts: PkgManagerPackContext[]) => [
        ...queue,
        ...contexts,
      ],
    }),

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
    events: {} as InternalPackMachineEvents | PackMachineEvents,
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
   * Merge {@link PackMachineInput} with {@link PACK_MACHINE_CONTEXT_DEFAULTS}
   */
  context: R.piped(R.prop('input'), R.merge(PACK_MACHINE_CONTEXT_DEFAULTS)),
  on: {
    ABORT: {
      actions: [
        log(({event: {reason}}) =>
          reason ? `Aborting PackMachine: ${reason}` : 'Aborting PackMachine',
        ),
        'destroyAllChildren',
      ],
    },
    PACK: {
      actions: {
        /**
         * Enqueue all {@link PackMachinePackEvent.contexts}
         */
        params: R.piped(R.prop('event'), R.prop('contexts')),
        type: 'enqueue',
      },
    },
    'xstate.done.actor.pack.*': {
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
    },
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
