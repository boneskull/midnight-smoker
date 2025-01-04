import type {
  InstallError,
  PkgManagerEnvelope,
  SmokerOptions,
  SomePackError,
} from 'midnight-smoker';
import type {Executor} from 'midnight-smoker/defs/executor';
import type {SetRequired} from 'type-fest';

import {
  InstallMachine,
  type InstallMachineHaltEvent,
  type InstallMachineInput,
  type InstallMachineInstallEvent,
} from '@midnight-smoker/tarball-installer/install';
import {
  PackMachine,
  type PackMachineHaltEvent,
  type PackMachineInput,
} from '@midnight-smoker/tarball-installer/pack';
import {
  ERROR,
  FINAL,
  InstallEvents,
  OK,
  PackEvents,
  PARALLEL,
  PkgManagerEvents,
} from 'midnight-smoker/constants';
import {LifecycleError, MachineError} from 'midnight-smoker/error';
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
  type PkgManagerInstallBeginMachineEvent,
  type PkgManagerInstallFailedMachineEvent,
  type PkgManagerInstallOkMachineEvent,
  type PkgManagerLingeredEvent,
  type PkgManagerPackFailedMachineEvent,
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
  sendTo,
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

type AnyPkgManagerMachineEvent = AnyInstallMachineEvent | AnyPackMachineEvent;

type PkgManagerAbortEvent = SetRequired<AbortEvent, 'reason'>;

type InternalPkgManagerMachineEvent =
  | PkgManagerAbortEvent
  | PkgManagerMachineInstallMachineDoneEvent
  | PkgManagerMachineInstallMachineErrorEvent
  | PkgManagerMachinePackMachineDoneEvent
  | PkgManagerMachinePackMachineErrorEvent;

export type PkgManagerMachineEvent =
  | AnyPkgManagerMachineEvent
  | PkgManagerMachineHaltEvent;

export type PkgManagerMachineHaltEvent = MachineEvent<'HALT', {now?: boolean}>;
type PkgManagerMachineInstallMachineDoneEvent = DoneActorEvent<
  void,
  'install-machine.*'
>;
type PkgManagerMachineInstallMachineErrorEvent = ErrorActorEvent<
  Error,
  'install-machine.*'
>;

export type PkgManagerMachineOutput =
  | ActorOutputOk<{aborted: false; noop: boolean}>
  | PkgManagerMachineOutputError;

export type PkgManagerMachineOutputError = ActorOutputError<
  MachineError,
  {aborted?: boolean; noop: boolean}
>;
type PkgManagerMachinePackMachineDoneEvent = DoneActorEvent<
  void,
  'pack-machine.*'
>;
type PkgManagerMachinePackMachineErrorEvent = ErrorActorEvent<
  Error,
  'pack-machine.*'
>;

export interface PkgManagerMachineContext extends PkgManagerMachineInput {
  /**
   * The base {@link Schema.PkgManagerContext} object for passing to the
   * {@link PackageManagerDef}'s operations
   */
  ctx?: Readonly<PkgManagerContext>;

  /**
   * Aggregate error object for any error occuring in this machine
   */
  error?: MachineError;

  /**
   * If `true`, the machine is in the process of gracefully halting
   */
  halting?: boolean;

  /**
   * Reference to {@link InstallMachine} actor
   */
  installMachineRef?: ActorRefFromLogic<typeof InstallMachine>;

  /**
   * Queue of packages to install
   */
  installQueue: InstallManifest[];

  /**
   * List of successfully-installed packages
   */
  manifestsInstalled: InstallManifest[];

  /**
   * Reference to {@link PackMachine} actor
   */
  packMachineRef?: ActorRefFromLogic<typeof PackMachine>;

  /**
   * Queue of workspaces to pack
   */
  packQueue: WorkspaceInfo[];

  /**
   * Options for package manager behavior.
   *
   * Props will be included in {@link ctx}.
   */
  pkgManagerOpts: PkgManagerOpts;

  /**
   * A serialized copy of {@link PkgManagerMachineInput.envelope.spec}.
   *
   * Just here for convenience, since many events will need this information.
   */
  spec: StaticPkgManagerSpec;

  /**
   * If we should use workspaces, this flag will be assigned to the
   * {@link PkgManagerContext} object
   *
   * @see `createPkgManagerContext` state
   */
  useWorkspaces: boolean;
  workspacesPacked: WorkspaceInfo[];
}

export interface PkgManagerMachineInput {
  /**
   * The envelope describing the package manager
   */
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
   * The parent actor reference.
   *
   * Most events are sent to it.
   */
  parentRef?: ActorRef<any, AnyPkgManagerMachineEvent>;

  /**
   * Options for the package manager
   */
  pkgManagerOpts?: PkgManagerOpts;

  /**
   * `midnight-smoker` options object
   */
  smokerOptions: SmokerOptions;

  /**
   * Information about one or more workspaces.
   *
   * If this contains a single item, then we either have one workspace _or_ are
   * not in a monorepo.
   */
  workspaces: WorkspaceInfo[];
}

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
    appendInstalledManifest: assign({
      manifestsInstalled: (
        {context: {manifestsInstalled}},
        manifest: InstallManifest,
      ): InstallManifest[] => [...manifestsInstalled, manifest],
    }),
    appendPackedWorkspace: assign({
      workspacesPacked: (
        {context: {workspacesPacked}},
        workspace: WorkspaceInfo,
      ): WorkspaceInfo[] => [...workspacesPacked, workspace],
    }),
    assignCtx: assign({
      ctx: (
        _,
        ctx?: Readonly<PkgManagerContext>,
      ): Readonly<PkgManagerContext> | undefined => ctx,
    }),
    assignError: assign({
      error: ({context, self}, err?: AbortReason): MachineError | undefined => {
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
    drainInstallQueue: enqueueActions(
      ({context: {installMachineRef, installQueue}, enqueue, self}): void => {
        assert.ok(installMachineRef, 'Expected InstallMachine reference');
        const evt: InstallMachineInstallEvent = {
          manifests: installQueue,
          sender: self.id,
          type: 'INSTALL',
        };
        enqueue.sendTo(installMachineRef, evt);
        enqueue.assign({
          installQueue: [],
        });
      },
    ),
    emitLingered: enqueueActions(
      ({context: {ctx, parentRef}, enqueue, self: {id: sender}}) => {
        const evt: PkgManagerLingeredEvent = {
          directory: ctx!.tmpdir,
          sender,
          type: PkgManagerEvents.Lingered,
        };
        enqueue.emit(evt);
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
      },
    ),
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

    /**
     * Emits the {@link InstallEvents.PkgInstallFailed} event. Sends to parent
     * actor, if present. **This is a fatal error** and thus it calls the
     * `abort` action.
     */
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
        error: InstallError,
      ): void => {
        assert.ok(error, 'Expected an error');
        const evt: PkgManagerInstallFailedMachineEvent = {
          error,
          pkgManager,
          sender,
          type: InstallEvents.PkgManagerInstallFailed,
        };
        enqueue.emit(evt);
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
        // @ts-expect-error TS limitation
        enqueue({params: error, type: 'abort'});
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

    /**
     * Emits the {@link PackEvents.PkgPackFailed} event. Sends to parent actor,
     * if present. **This is a fatal error** and thus it calls the `abort`
     * action.
     */
    emitPkgManagerPackFailed: enqueueActions(
      (
        {
          context: {
            envelope: {spec: pkgManager},
            parentRef,
          },
          enqueue,
          self: {id: sender},
        },
        error: SomePackError,
      ): void => {
        const evt: PkgManagerPackFailedMachineEvent = {
          error,
          pkgManager,
          sender,
          type: PackEvents.PkgManagerPackFailed,
        };
        enqueue.emit(evt);
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
        // @ts-expect-error TS limitation
        enqueue({params: error, type: 'abort'});
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
        const manifests: InstallManifest[] = additionalDeps.map(
          (dep): InstallManifest => ({
            cwd: ctx.tmpdir,
            isAdditional: true,
            pkgName: dep,
            pkgSpec: dep,
          }),
        );
        return [...installQueue, ...manifests];
      },
    }),
    enqueueInstallItem: assign({
      installQueue: (
        {context: {installQueue}},
        manifest: InstallManifest,
      ): InstallManifest[] => [...installQueue, manifest],
    }),

    enqueuePackItems: assign({
      packQueue: (
        {context: {packQueue}},
        workspaces: WorkspaceInfo[],
      ): WorkspaceInfo[] => [...packQueue, ...workspaces],
    }),

    /**
     * Frees the reference to the {@link InstallMachine} actor
     */
    freeInstallMachineRef: assign({
      installMachineRef: undefined,
    }),

    /**
     * Frees the reference to the {@link PackMachine} actor
     */
    freePackMachineRef: assign({
      packMachineRef: undefined,
    }),

    /**
     * Sends a {@link InstallMachineHaltEvent} to the {@link InstallMachine}
     * reference for graceful shutdown.
     *
     * DANGER: {@link PkgManagerMachineContext.installMachineRef} _must_ be
     * defined or this will break horribly
     */
    gracefullyStopInstallMachine: sendTo(
      ({
        context: {installMachineRef},
      }): ActorRefFromLogic<typeof InstallMachine> => installMachineRef!,
      ({self}): InstallMachineHaltEvent => ({
        sender: self.id,
        type: 'HALT',
      }),
    ),

    /**
     * Sends a {@link PackMachineHaltEvent} to the {@link PackMachine} reference
     * for graceful shutdown.
     *
     * DANGER: {@link PkgManagerMachineContext.packMachineRef} _must_ be defined
     * or this will break horribly
     */
    gracefullyStopPackMachine: sendTo(
      ({context: {packMachineRef}}): ActorRefFromLogic<typeof PackMachine> =>
        packMachineRef!,
      ({self}): PackMachineHaltEvent => ({
        sender: self.id,
        type: 'HALT',
      }),
    ),

    /**
     * For testing purposes only
     */
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),

    /**
     * Re-emits an installation or pack event, and sends it to the parent actor
     * (if any)
     */
    resend: enqueueActions(
      (
        {context: {parentRef}, enqueue, self: {id: sender}},
        event: AnyPkgInstallMachineEvent | AnyPkgPackMachineEvent,
      ): void => {
        // breadcrumbs
        // TODO: make this a proper convention
        const evt = {...event, sender: [sender, ...castArray(event.sender)]};
        enqueue.emit(evt);
        if (parentRef) {
          enqueue.sendTo(parentRef, evt);
        }
      },
    ),

    /**
     * Sets the `halting` flag to `true`
     */
    setHaltingTrue: assign({
      halting: true,
    }),

    /**
     * Spawns the {@link InstallMachine} actor and saves its reference
     */
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
    }),

    /**
     * Spawns the {@link PackMachine} actor and saves its reference
     */
    spawnPackMachine: assign({
      packMachineRef: ({
        context: {ctx, envelope, packMachineRef, packQueue},
        self,
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
          parentRef: self,
          workspaces: packQueue,
        };

        return spawn('PackMachine', {
          id,
          input,
        });
      },
    }),
  },
  actors: {
    /**
     * Creates a {@link PkgManagerContext} object
     */
    createPkgManagerContext: createPkgManagerContextLogic,

    /**
     * Destroys a {@link PkgManagerContext} object
     */
    destroyPkgManagerContext: destroyPkgManagerContextLogic,

    /**
     * Installs packages
     */
    InstallMachine,

    /**
     * Packs packages
     */
    PackMachine,

    /**
     * Package manager setup lifecycle
     */
    setupPkgManager: setupPkgManagerLogic,

    /**
     * Package manager teardown lifecycle
     */
    teardownPkgManager: teardownPkgManagerLogic,
  },
  guards: {
    /**
     * @remarks
     * I hope this isn't a hot path
     */
    allInstallablesInstalled: ({
      context: {
        manifestsInstalled,
        smokerOptions: {add = []},
        workspacesPacked,
      },
    }): boolean =>
      workspacesPacked.length + add.length === manifestsInstalled.length &&
      workspacesPacked
        .map(({localPath}) => localPath)
        .every((path): boolean =>
          manifestsInstalled.some(({localPath}): boolean => localPath === path),
        ),
    allWorkspacesPacked: ({context: {workspaces, workspacesPacked}}): boolean =>
      // TODO better data structure

      workspaces.length === workspacesPacked.length &&
      workspaces
        .map(({localPath}) => localPath)
        .every((path): boolean =>
          workspacesPacked.some(({localPath}): boolean => localPath === path),
        ),

    canShutdown: and([not('isHalting'), not('hasError')]),

    /**
     * Returns `true` if the context has a {@link PkgManagerContext} object
     */
    hasContext: ({context: {ctx}}): boolean => !!ctx,

    /**
     * Returns `true` if the context has an error
     */
    hasError: ({context: {error}}): boolean => !!error,

    /**
     * Returns `true` if the context has any items in the install queue
     */
    hasInstallItems: ({context: {installQueue}}): boolean =>
      !!installQueue.length,

    /**
     * Returns `true` if the machine is in the process of halting
     */
    isHalting: ({context: {halting}}): boolean => !!halting,

    /**
     * Returns `true` if the machine should halt immediately
     *
     * @see {@link PkgManagerMachineHaltEvent.now}
     */
    shouldHaltNow: (_, {now}: PkgManagerMachineHaltEvent): boolean => !!now,

    /**
     * Returns `true` if the temp dir should be kept around. This will cause the
     */
    shouldLinger: ({context: {ctx}}): boolean => !!ctx?.linger,

    shouldStopInstallMachine: and([
      'allWorkspacesPacked',
      'allInstallablesInstalled',
    ]),

    shouldStopPackMachine: and(['allWorkspacesPacked']),
  },
  types: {
    context: {} as PkgManagerMachineContext,
    events: {} as InternalPkgManagerMachineEvent | PkgManagerMachineEvent,
    input: {} as PkgManagerMachineInput,
    output: {} as PkgManagerMachineOutput,
  },
}).createMachine({
  /**
   * Sets default values for the {@link PkgManagerMachineContext}
   */
  context: ({
    input: {
      envelope,
      pkgManagerOpts: {loose = false, verbose = false} = {},
      smokerOptions,
      workspaces,
      ...input
    },
  }): PkgManagerMachineContext => {
    const context: PkgManagerMachineContext = {
      envelope,
      smokerOptions,
      ...input,
      installQueue: [],
      manifestsInstalled: [],
      packQueue: [...workspaces],
      pkgManagerOpts: {loose, verbose},
      spec: serialize(envelope.spec),
      useWorkspaces: smokerOptions.all || !!smokerOptions.workspace.length,
      workspaces,
      workspacesPacked: [],
    };
    return context;
  },
  entry: [
    INIT_ACTION,
    log(({context: {spec}}) => `💡 PkgManagerMachine ${spec.label} online`),
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
  initial: 'startup',
  on: {
    ABORT: [
      {
        actions: [
          log(
            ({event: {reason}}) =>
              `❌ ERROR: ${isString(reason) ? reason : reason.message}`,
          ),
          {
            params: ({event: {reason}}) => reason,
            type: 'assignError',
          },
        ],
        guard: 'canShutdown',
        target: '.shutdown',
      },
      {
        actions: [
          log(
            ({event: {reason}}) =>
              `❌ ERROR: ${isString(reason) ? reason : reason.message}`,
          ),
          {
            params: ({event: {reason}}) => reason,
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
        actions: [
          'setHaltingTrue',
          'gracefullyStopPackMachine',
          'gracefullyStopInstallMachine',
        ],
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
    shutdown: {
      entry: [log('📴 Shutting down'), 'setHaltingTrue'],
      initial: 'maybeTeardownLifecycle',
      onDone: {
        target: 'done',
      },
      states: {
        destroyPkgManagerContext: {
          description: 'Destroys the PkgManagerContext',
          entry: [log('🔥 Destroying package manager context')],
          invoke: {
            input: ({
              context: {ctx, fileManager},
            }): DestroyPkgManagerContextLogicInput => ({
              ctx: ctx!,
              fileManager,
            }),
            onDone: [
              {
                actions: [
                  log(
                    ({context: {ctx}}) =>
                      `🔥 Letting temp dir ${
                        ctx!.tmpdir
                      } linger for further inspection`,
                  ),
                  {type: 'emitLingered'},
                  {
                    params: (): undefined => undefined,
                    type: 'assignCtx',
                  },
                ],
                guard: 'shouldLinger',
                target: 'done',
              },
              {
                actions: [
                  log(
                    ({context: {ctx}}) =>
                      `🔥 Destroyed package manager context with temp dir ${
                        ctx!.tmpdir
                      }`,
                  ),
                  {
                    params: (): undefined => undefined,
                    type: 'assignCtx',
                  },
                ],
                target: 'done',
              },
            ],
            onError: {
              actions: [
                {
                  params: ({
                    context: {
                      envelope: {plugin},
                      spec: {label: spec},
                    },
                    event: {error},
                  }): LifecycleError =>
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
              target: 'done',
            },
            src: 'destroyPkgManagerContext',
          },
        },
        done: {
          type: FINAL,
        },
        maybeTeardownLifecycle: {
          always: [
            {guard: 'hasContext', target: 'teardownLifecycle'},
            {target: 'done'},
          ],
        },
        teardownLifecycle: {
          description: 'Runs teardown() of PkgManager, if any',
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
                log(
                  '❗ Teardown lifecycle hook errored! Attempting to destroy context...',
                ),
                {
                  params: ({
                    context: {
                      envelope: {plugin},
                      spec: {label: spec},
                    },
                    event: {error},
                  }): LifecycleError =>
                    new LifecycleError(
                      error,
                      'teardown',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  type: 'assignError',
                },
              ],
              description:
                'Assign the error, but continue to destroy context anyhow',
              target: 'destroyPkgManagerContext',
            },
            src: 'teardownPkgManager',
          },
        },
      },
    },
    startup: {
      entry: [
        log(
          ({context: {workspaces}}) =>
            `🚀 Starting up with ${workspaces.length} workspace(s)`,
        ),
      ],
      initial: 'createPkgManagerContext',
      onDone: {
        target: 'working',
      },
      states: {
        createPkgManagerContext: {
          invoke: {
            input: ({
              context: {
                executor,
                fileManager,
                pkgManagerOpts: options,
                smokerOptions: {linger},
                spec,
                useWorkspaces,
              },
            }): CreatePkgManagerContextLogicInput => ({
              executor,
              fileManager,
              linger,
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
                  }): LifecycleError =>
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
            },
            src: 'createPkgManagerContext',
          },
        },
        done: {
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
                  }): LifecycleError =>
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
              target: 'done',
            },
            src: 'setupPkgManager',
          },
        },
      },
    },
    working: {
      entry: [log('🏃 Working...'), 'enqueueAdditionalDeps'],
      exit: [log('🟡 Stopping work')],
      // we can start installing additional deps as soon as we have a tmpdir
      onDone: {
        target: 'shutdown',
      },
      states: {
        installing: {
          entry: [log('Entering "installing" state')],
          exit: ['freeInstallMachineRef', log('Exiting "installing" state')],
          initial: 'running',
          states: {
            done: {
              type: FINAL,
            },
            running: {
              always: [
                {
                  actions: ['gracefullyStopInstallMachine'],
                  guard: 'shouldStopInstallMachine',
                },
                {actions: ['drainInstallQueue'], guard: 'hasInstallItems'},
              ],
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
                      params: R.piped(R.prop('event'), R.prop('error')),
                      type: 'emitPkgManagerInstallFailed',
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
                      params: ({event: {installManifest}}) => installManifest,
                      type: 'appendInstalledManifest',
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
              always: {
                actions: ['gracefullyStopPackMachine'],
                guard: 'shouldStopPackMachine',
              },
              entry: [
                {type: 'spawnPackMachine'},
                log('📦 Spawned Pack machine'),
              ],
              on: {
                [PackEvents.PkgPackBegin]: {
                  actions: [
                    log(({event: {type}}) => `🔁 Forwarding event: ${type}`),
                    {
                      params: ({event}): AnyPkgPackMachineEvent => event,
                      type: 'resend',
                    },
                  ],
                },
                [PackEvents.PkgPackFailed]: {
                  actions: [
                    log(({event: {type}}) => `🔁 Forwarding event: ${type}`),
                    {
                      params: ({event: {error}}) => error,
                      type: 'emitPkgManagerPackFailed',
                    },
                  ],
                },
                [PackEvents.PkgPackOk]: {
                  actions: [
                    log(({event: {type}}) => `🔁 Forwarding event: ${type}`),
                    {
                      params: ({event: {workspace}}): WorkspaceInfo =>
                        workspace,
                      type: 'appendPackedWorkspace',
                    },
                    {
                      params: ({event: {installManifest}}): InstallManifest =>
                        installManifest,
                      type: 'enqueueInstallItem',
                    },
                    log(
                      ({event: {installManifest}}) =>
                        `🔁 Enqueued "${installManifest.pkgName}" for install`,
                    ),
                  ],
                  description:
                    'Marks the workspace as packed and enqueues the InstallManifest for the install machine. Re-emits and optionally forwards the event.',
                },
                'xstate.done.actor.pack-machine.*': {
                  actions: [log('📦 Pack machine done')],
                  target: 'done',
                },
                'xstate.error.actor.pack-machine.*': {
                  actions: [
                    log('❗ Pack machine errored'),
                    {
                      params: ({event: {error}}): Error => error,
                      type: 'abort',
                    },
                  ],
                  target: 'done',
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
