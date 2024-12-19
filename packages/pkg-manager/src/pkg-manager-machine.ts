import type {PkgManagerEnvelope, SmokerOptions} from 'midnight-smoker';
import type {Executor} from 'midnight-smoker/defs/executor';
import type {Except, SetRequired} from 'type-fest';

import {
  InstallMachine,
  type InstallMachineInput,
} from '@midnight-smoker/tarball-installer/install';
import {
  PackMachine,
  type PackMachineInput,
} from '@midnight-smoker/tarball-installer/pack';
import {
  ERROR,
  FINAL,
  InstallEvents,
  OK,
  PARALLEL,
  WildcardEvents,
} from 'midnight-smoker/constants';
import {
  type InstallError,
  LifecycleError,
  MachineError,
  TimeoutError,
} from 'midnight-smoker/error';
import {
  type AbortEvent,
  type AbortReason,
  type ActorOutputError,
  type ActorOutputOk,
  type AnyInstallMachineEvent,
  type AnyPackMachineEvent,
  type AnyPkgInstallMachineEvent,
  type AnyPkgPackMachineEvent,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
  type MachineEvent,
  type PkgInstallFailedMachineEvent,
  type PkgManagerInstallBeginMachineEvent,
  type PkgManagerInstallFailedMachineEvent,
  type PkgManagerInstallOkMachineEvent,
} from 'midnight-smoker/machine';
import {
  type InstallManifest,
  type PkgManagerContext,
  type PkgManagerOpts,
  type StaticPkgManagerSpec,
  type WorkspaceInfo,
} from 'midnight-smoker/pkg-manager';
import {
  assert,
  castArray,
  type FileManager,
  fromUnknownError,
  isString,
  R,
  serialize,
  uniqueId,
} from 'midnight-smoker/util';
import {
  type ActorRef,
  type ActorRefFromLogic,
  and,
  assign,
  type DoneActorEvent,
  enqueueActions,
  type ErrorActorEvent,
  log,
  not,
  raise,
  setup,
} from 'xstate';
import 'xstate/guards';

import {
  createPkgManagerContextLogic,
  type CreatePkgManagerContextLogicInput,
  destroyPkgManagerContextLogic,
  type DestroyPkgManagerContextLogicInput,
} from './pkg-manager-context';
import {
  type LifecycleLogicInput,
  setupPkgManagerLogic,
  teardownPkgManagerLogic,
} from './pkg-manager-lifecycle';

/**
 * Default time to wait (in ms) before bailing out of `idle`
 */
const DEFAULT_INITAL_TIMEOUT = 30_000;

/**
 * Machine which controls how a `PkgManager` performs its operations.
 */
export const PkgManagerMachine = setup({
  actions: {
    abort: raise(
      (_, reason: AbortReason): PkgManagerAbortEvent => ({
        reason,
        type: 'ABORT',
      }),
    ),
    assignCtx: assign({
      ctx: (
        _,
        ctx?: Readonly<PkgManagerContext>,
      ): Readonly<PkgManagerContext> | undefined => ctx,
    }),
    assignError: assign({
      error: (
        {context, self},
        {error: err}: {error?: unknown},
      ): MachineError | undefined => {
        if (!err) {
          return;
        }
        const error = fromUnknownError(err);
        if (context.error) {
          // this is fairly rare. afaict it only happens
          // when both the teardown and pruneTempDir actors fail
          return context.error.cloneWith(error);
        }

        return new MachineError(
          `PkgManagerMachine for ${
            context.envelope.spec.label
          } encountered an error (${
            'code' in error ? error.code : error.name
          })`,
          error,
          self.id,
        );
      },
    }),
    assignManifestsInstalled: assign({
      manifestsInstalled: (
        {context: {manifestsInstalled}},
        manifest: InstallManifest,
      ): InstallManifest[] => [...manifestsInstalled, manifest],
    }),
    emitPkgManagerInstallBegin: enqueueActions(
      ({
        context: {
          envelope: {spec: pkgManager},
          installQueue,
          parentRef,
        },
        enqueue,
        self: {id: sender},
      }): void => {
        const evt: PkgManagerInstallBeginMachineEvent = {
          manifests: [...installQueue],
          pkgManager,
          sender,
          type: InstallEvents.PkgManagerInstallBegin,
        };
        enqueue.emit(evt);
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
      },
    ),
    emitPkgManagerInstallFailed: enqueueActions(
      (
        {
          context: {
            envelope: {spec: pkgManager},
            parentRef,
          },
          enqueue,
          self: {id: sender},
        },
        event: PkgInstallFailedMachineEvent,
      ): void => {
        const evt: PkgManagerInstallFailedMachineEvent = {
          error: event.error,
          pkgManager,
          sender,
          type: InstallEvents.PkgManagerInstallFailed,
        };
        enqueue.emit(evt);
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
      },
    ),
    emitPkgManagerInstallOk: enqueueActions(
      ({
        context: {
          envelope: {spec: pkgManager},
          manifestsInstalled: installedManifests,
          parentRef,
        },
        enqueue,
        self: {id: sender},
      }): void => {
        const evt: PkgManagerInstallOkMachineEvent = {
          manifests: installedManifests,
          pkgManager,
          sender,
          type: InstallEvents.PkgManagerInstallOk,
        };
        enqueue.emit(evt);
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
      },
    ),
    enqueueAdditionalDeps: assign({
      installQueue: ({
        context: {
          ctx,
          installQueue,
          smokerOptions: {add: additionalDeps},
        },
      }): InstallManifest[] => {
        assert.ok(ctx);
        const manifests: InstallManifest[] = additionalDeps.map((dep) => ({
          cwd: ctx.tmpdir,
          isAdditional: true,
          pkgName: dep,
          pkgSpec: dep,
        }));
        return [...installQueue, ...manifests];
      },
    }),
    enqueuePackItems: assign({
      packQueue: (
        {context: {packQueue}},
        workspaces: WorkspaceInfo[],
      ): WorkspaceInfo[] => [...packQueue, ...workspaces],
    }),
    freeInstallMachineRef: assign({
      installMachineRef: undefined,
    }),
    freePackMachineRef: assign({
      packMachineRef: undefined,
    }),
    haltChildren: enqueueActions(
      ({
        context: {installMachineRef, packMachineRef},
        enqueue,
        self: {id: sender},
      }): void => {
        if (packMachineRef) {
          enqueue.sendTo(packMachineRef, {sender, type: 'HALT'});
        }
        if (installMachineRef) {
          enqueue.sendTo(installMachineRef, {sender, type: 'HALT'});
        }
      },
    ),
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),
    resend: enqueueActions(
      (
        {context: {parentRef}, enqueue, self: {id: sender}},
        event: AnyPkgInstallMachineEvent | AnyPkgPackMachineEvent,
      ): void => {
        // breadcrumbs
        const evt = {...event, sender: [sender, ...castArray(event.sender)]};
        enqueue.emit(evt);
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
      },
    ),
    setHaltingTrue: assign({
      halting: true,
    }),
    spawnInstallMachine: assign({
      installMachineRef: ({
        context: {ctx, envelope, installMachineRef, installQueue},
        self,
        spawn,
      }): ActorRefFromLogic<typeof InstallMachine> => {
        assert.ok(!installMachineRef);
        assert.ok(ctx);

        const id = uniqueId({
          prefix: 'install-machine',
          suffix: envelope.spec.label,
        });

        const input: InstallMachineInput = {
          ctx,
          envelope,
          manifests: installQueue,
          parentRef: self,
        };

        return spawn('InstallMachine', {
          id,
          input,
        });
      },
      installQueue: [],
    }),
    spawnPackMachine: assign({
      packMachineRef: ({
        context: {ctx, envelope, packMachineRef, packQueue},
        spawn,
      }): ActorRefFromLogic<typeof PackMachine> => {
        assert.ok(!packMachineRef);
        assert.ok(ctx);

        const id = uniqueId({
          prefix: 'pack-machine',
          suffix: envelope.spec.label,
        });

        const input: PackMachineInput = {
          ctx,
          envelope,
          workspaces: packQueue,
        };

        return spawn('PackMachine', {
          id,
          input,
        });
      },
      packQueue: [],
    }),
  },
  actors: {
    createPkgManagerContext: createPkgManagerContextLogic,
    destroyPkgManagerContext: destroyPkgManagerContextLogic,
    InstallMachine,
    PackMachine,
    setupPkgManager: setupPkgManagerLogic,
    teardownPkgManager: teardownPkgManagerLogic,
  },
  delays: {
    initialTimeout: ({context: {initialTimeout}}): number => initialTimeout,
  },
  guards: {
    hasContext: ({context: {ctx}}): boolean => !!ctx,
    hasError: ({context: {error}}): boolean => !!error,
    hasPackItems: ({context: {packQueue}}): boolean => !!packQueue.length,
    isHalting: ({context: {halting}}): boolean => !!halting,
    shouldHaltNow: (_, {now}: PkgManagerMachineHaltEvent): boolean => !!now,
  },
  types: {
    context: {} as PkgManagerMachineContext,
    events: {} as InternalPkgManagerMachineEvent | PkgManagerMachineEvent,
    input: {} as PkgManagerMachineInput,
    output: {} as PkgManagerMachineOutput,
  },
}).createMachine({
  context: ({
    input: {
      envelope,
      initialTimeout = DEFAULT_INITAL_TIMEOUT,
      opts: {loose = false, verbose = false} = {},
      smokerOptions,
      workspaces = [],
      ...input
    },
  }): PkgManagerMachineContext => {
    const props = {
      installFailures: [],
      installQueue: [],
      manifestsInstalled: [],
      opts: {loose, verbose},
      packQueue: [...workspaces],
      spec: serialize(envelope.spec),
    } satisfies Partial<PkgManagerMachineContext>;

    return {
      ...input,
      envelope,
      initialTimeout,
      smokerOptions,
      useWorkspaces: smokerOptions.all || !!smokerOptions.workspace.length,
      ...props,
    };
  },
  entry: [
    INIT_ACTION,
    log(
      ({context: {initialTimeout, spec}}) =>
        `💡 PkgManagerMachine ${spec.label} online; idle timeout: ${initialTimeout}`,
    ),
  ],
  exit: [
    log(
      ({
        context: {
          spec: {label: spec},
        },
      }) => `🛑 PkgManagerMachine for ${spec} stopped`,
    ),
  ],
  id: 'PkgManagerMachine',
  initial: 'idle',
  on: {
    ABORT: [
      {
        actions: [
          log(
            ({event: {reason}}) =>
              `❌ ERROR: ${isString(reason) ? reason : reason.message}`,
          ),
          {
            params: ({event: {reason: error}}) => ({error}),
            type: 'assignError',
          },
        ],
        guard: and([not('isHalting'), not('hasError')]),
        target: '.shutdown',
      },
      {
        actions: [
          log(
            ({event: {reason}}) =>
              `❌ ERROR: ${isString(reason) ? reason : reason.message}`,
          ),
          {
            params: ({event: {reason: error}}) => ({error}),
            type: 'assignError',
          },
        ],
      },
    ],
    HALT: [
      {
        description: 'If "now" is true, we should halt immediately',
        guard: {
          params: R.prop('event'),
          type: 'shouldHaltNow',
        },
        target: '.shutdown',
      },
      {
        actions: ['setHaltingTrue', 'haltChildren'],
        description: 'If "now" is falsy, wait until the children have stopped',
      },
    ],
  },
  output: ({context: {error}, self: {id}}): PkgManagerMachineOutput => {
    // const noop = isEmpty(workspaceInfo);
    // TODO: Fix
    const noop = false;
    return error
      ? {aborted: true, actorId: id, error, noop, type: ERROR}
      : {aborted: false, actorId: id, noop, type: OK};
  },
  states: {
    done: {
      type: FINAL,
    },
    idle: {
      after: {
        initialTimeout: {
          actions: [
            log(
              ({context: {initialTimeout}}) =>
                `⏰ Idle timeout reached (${initialTimeout}ms); aborting`,
            ),
            {
              params: ({context: {initialTimeout}}) =>
                new TimeoutError(
                  `PkgManagerMachine idle timeout reached (${initialTimeout}ms)`,
                  initialTimeout,
                ),
              type: 'abort',
            },
          ],
        },
      },
      always: [
        {
          guard: 'hasPackItems',
          target: 'startup',
        },
      ],
      on: {
        START: {
          actions: [
            log('👀 Received START'),
            {
              params: ({event: {workspaces}}): WorkspaceInfo[] => workspaces,
              type: 'enqueuePackItems',
            },
          ],
        },
      },
    },
    shutdown: {
      entry: [log('🛑 Shutting down'), 'setHaltingTrue'],
      initial: 'gate',
      onDone: {
        target: 'done',
      },
      states: {
        destroyPkgManagerContext: {
          description: 'Destroys the PkgManagerContext',
          entry: log('🔥 Destroying package manager context'),
          invoke: {
            input: ({
              context: {ctx, fileManager},
            }): DestroyPkgManagerContextLogicInput => ({
              ctx: ctx!,
              fileManager,
            }),
            onDone: {
              actions: {
                params: (): undefined => undefined,
                type: 'assignCtx',
              },
              target: 'done',
            },
            onError: {
              actions: [
                {
                  params: ({
                    context: {
                      envelope: {plugin},
                      spec: {label: spec},
                    },
                    event: {error},
                  }) =>
                    new LifecycleError(
                      error,
                      'teardown',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  type: 'abort',
                },
              ],
              target: 'errored',
            },
            src: 'destroyPkgManagerContext',
          },
        },
        done: {
          type: FINAL,
        },
        errored: {
          type: FINAL,
        },
        gate: {
          always: [
            {
              guard: 'hasContext',
              target: 'teardownLifecycle',
            },
            {
              target: 'done',
            },
          ],
        },
        teardownLifecycle: {
          description: 'Runs teardown() of PkgManager, if any',
          entry: log(`🔽 Running teardown lifecycle hook`),
          invoke: {
            input: ({
              context: {
                ctx,
                envelope: {pkgManager},
              },
            }): LifecycleLogicInput => {
              assert.ok(ctx);
              return {
                ctx,
                pkgManager,
              };
            },
            onDone: 'destroyPkgManagerContext',
            onError: {
              actions: [
                {
                  params: ({
                    context: {
                      envelope: {plugin},
                      spec: {label: spec},
                    },
                    event: {error},
                  }) =>
                    new LifecycleError(
                      error,
                      'teardown',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  type: 'abort',
                },
                log('❗ Teardown lifecycle hook errored out! Aborting...'),
              ],
              target: 'errored',
            },
            src: 'teardownPkgManager',
          },
        },
      },
    },
    startup: {
      entry: [
        log(
          ({context: {packQueue}}) =>
            `🚀 Starting up with ${packQueue.length} workspace(s)`,
        ),
      ],
      initial: 'createPkgManagerContext',
      onDone: [{guard: not('hasError'), target: 'working'}],
      states: {
        createPkgManagerContext: {
          invoke: {
            input: ({
              context: {
                executor,
                fileManager,
                opts: options,
                spec,
                useWorkspaces,
              },
            }): CreatePkgManagerContextLogicInput => ({
              executor,
              fileManager,
              options,
              spec,
              useWorkspaces,
            }),
            onDone: {
              actions: [
                log(
                  ({event: {output}}) =>
                    `🎁 Created package manager context with temp directory: ${output.tmpdir}`,
                ),
                {
                  params: ({event: {output}}): Readonly<PkgManagerContext> =>
                    output,
                  type: 'assignCtx',
                },
              ],
              target: 'setupLifecycle',
            },
            onError: {
              actions: [
                log('❗ Setup lifecycle hook errored out! Aborting...'),
                {
                  params: ({
                    context: {
                      envelope: {plugin},
                      spec: {label: spec},
                    },
                    event: {error},
                  }) =>
                    new LifecycleError(
                      error,
                      'setup',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  type: 'abort',
                },
              ],
              target: 'errored',
            },
            src: 'createPkgManagerContext',
          },
        },
        done: {
          type: FINAL,
        },
        errored: {
          type: FINAL,
        },
        setupLifecycle: {
          entry: [log('🔼 Running setup lifecycle hook')],
          invoke: {
            input: ({
              context: {
                ctx,
                envelope: {pkgManager},
              },
            }): LifecycleLogicInput => {
              assert.ok(ctx, 'Expected a PackageManagerContext');
              return {
                ctx,
                pkgManager,
              };
            },
            onDone: {
              target: 'done',
            },
            onError: {
              actions: [
                {
                  params: ({
                    context: {
                      envelope: {plugin},
                      spec: {label: spec},
                    },
                    event: {error},
                  }) =>
                    new LifecycleError(
                      error,
                      'setup',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  type: 'abort',
                },
              ],
              target: 'errored',
            },
            src: 'setupPkgManager',
          },
        },
      },
    },
    working: {
      entry: [log('🏃 Working...'), 'enqueueAdditionalDeps'],
      // we can start installing additional deps as soon as we have a tmpdir
      onDone: [
        {
          actions: log('⏪ Work complete; returning to idle'),
          guard: not('isHalting'),
          target: 'idle',
        },
        {
          actions: log('⏪ Work complete; shutting down'),
          guard: 'isHalting',
          target: 'shutdown',
        },
      ],
      states: {
        done: {
          type: FINAL,
        },
        installing: {
          exit: ['freeInstallMachineRef'],
          initial: 'running',
          states: {
            done: {
              entry: ['emitPkgManagerInstallOk'],
              type: FINAL,
            },
            running: {
              entry: [
                'spawnInstallMachine',
                log('💾 Spawned Install machine'),
                'emitPkgManagerInstallBegin',
              ],
              on: {
                [InstallEvents.PkgInstallBegin]: {
                  actions: [
                    log(({event}) => `🔁 Forwarding event: ${event.type}`),
                    {
                      params: R.prop('event'),
                      type: 'resend',
                    },
                  ],
                },
                [InstallEvents.PkgInstallFailed]: {
                  actions: [
                    log(({event}) => `🔁 Forwarding event: ${event.type}`),
                    {
                      params: R.prop('event'),
                      type: 'resend',
                    },
                    {
                      params: R.prop('event'),
                      type: 'emitPkgManagerInstallFailed',
                    },
                    {
                      params: ({event: {error}}) => error,
                      type: 'abort',
                    },
                  ],
                },
                [InstallEvents.PkgInstallOk]: {
                  actions: [
                    log(({event}) => `🔁 Forwarding event: ${event.type}`),
                    {
                      params: R.prop('event'),
                      type: 'resend',
                    },
                    {
                      params: ({event: {installManifest}}): InstallManifest =>
                        installManifest,
                      type: 'assignManifestsInstalled',
                    },
                  ],
                },
                'xstate.done.actor.install-machine.*': {
                  actions: [log('💾 Install machine done')],
                  target: 'done',
                },
                'xstate.error.actor.install-machine.*': {
                  actions: [
                    log('❗ Install machine errored'),
                    {
                      params: ({event: {error}}) => error,
                      type: 'abort',
                    },
                  ],
                },
              },
            },
          },
        },

        packing: {
          exit: ['freePackMachineRef'],
          initial: 'running',
          states: {
            done: {
              type: FINAL,
            },
            running: {
              entry: ['spawnPackMachine', log('📦 Spawned Pack machine')],
              on: {
                [WildcardEvents.AnyPackPkg]: {
                  actions: [
                    {
                      params: ({event}) => event,
                      type: 'resend',
                    },
                  ],
                },
                'xstate.done.actor.pack-machine.*': {
                  actions: [log('📦 Pack machine done')],
                  target: 'done',
                },
                'xstate.error.actor.pack-machine.*': {
                  actions: [
                    log('❗ Pack machine errored'),
                    {
                      params: ({event: {error}}) => error,
                      type: 'abort',
                    },
                  ],
                },
              },
            },
          },
        },
      },
      type: PARALLEL,
    },
  },
});
type PkgManagerMachinePackMachineDoneEvent = DoneActorEvent<
  void,
  'pack-machine.*'
>;
type PkgManagerMachineInstallMachineDoneEvent = DoneActorEvent<
  void,
  'install-machine.*'
>;
type PkgManagerMachinePackMachineErrorEvent = ErrorActorEvent<
  Error,
  'pack-machine.*'
>;
type PkgManagerMachineInstallMachineErrorEvent = ErrorActorEvent<
  Error,
  'install-machine.*'
>;
type AnyPkgManagerMachineEvent = AnyInstallMachineEvent | AnyPackMachineEvent;
type PkgManagerAbortEvent = SetRequired<AbortEvent, 'reason'>;

export type PkgManagerMachineEvent =
  | AnyPkgManagerMachineEvent
  | PkgManagerAbortEvent
  | PkgManagerMachineHaltEvent
  | PkgManagerMachineStartEvent;

export type PkgManagerMachineHaltEvent = MachineEvent<'HALT', {now?: boolean}>;

export type PkgManagerMachineOutput =
  | ActorOutputOk<{aborted: false; noop: boolean}>
  | PkgManagerMachineOutputError;

export type PkgManagerMachineOutputError = ActorOutputError<
  MachineError,
  {aborted?: boolean; noop: boolean}
>;

/**
 * @event
 */

export type PkgManagerMachineStartEvent = MachineEvent<
  'START',
  {
    workspaces: WorkspaceInfo[];
  }
>;
type InternalPkgManagerMachineEvent =
  | PkgManagerMachineInstallMachineDoneEvent
  | PkgManagerMachineInstallMachineErrorEvent
  | PkgManagerMachinePackMachineDoneEvent
  | PkgManagerMachinePackMachineErrorEvent;

export interface PkgManagerMachineContext
  extends Except<
    PkgManagerMachineInput,
    'workspaces',
    {requireExactProps: true}
  > {
  /**
   * The base {@link Schema.PkgManagerContext} object for passing to the
   * {@link PackageManagerDef}'s operations
   */
  ctx?: Readonly<PkgManagerContext>;

  /**
   * Aggregate error object for any error occuring in this machine
   */
  error?: MachineError;
  halting?: boolean;
  initialTimeout: number;

  installFailures: InstallError[];

  installMachineRef?: ActorRefFromLogic<typeof InstallMachine>;

  installQueue: InstallManifest[];

  manifestsInstalled: InstallManifest[];

  /**
   * Options for package manager behavior.
   *
   * Props will be included in {@link ctx}.
   */
  opts: PkgManagerOpts;
  packMachineRef?: ActorRefFromLogic<typeof PackMachine>;

  packQueue: WorkspaceInfo[];

  /**
   * A serialized copy of {@link PkgManagerMachineInput.envelope.spec}.
   *
   * Just here for convenience, since many events will need this information.
   */
  spec: StaticPkgManagerSpec;

  useWorkspaces: boolean;
}

export interface PkgManagerMachineInput {
  envelope: PkgManagerEnvelope;

  /**
   * The executor to pass to the package manager's functions
   */
  executor: Executor;

  /**
   * File manager instance for interacting with filesystem
   */
  fileManager: FileManager;

  /**
   * Number of ms to sit in the `idle` state and wait for the
   * {@link PkgManagerMachineStartEvent start event} before timing out.
   */
  initialTimeout?: number;

  /**
   * Options for the package manager
   */
  opts?: PkgManagerOpts;

  /**
   * The parent actor reference.
   *
   * Most events are sent to it.
   */
  parentRef?: ActorRef<any, AnyPkgManagerMachineEvent>;

  smokerOptions: SmokerOptions;

  /**
   * Information about one or more workspaces.
   *
   * If this contains a single item, then we either have one workspace _or_ are
   * not in a monorepo.
   */
  workspaces?: WorkspaceInfo[];
}
