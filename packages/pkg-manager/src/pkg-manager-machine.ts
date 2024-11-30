import {
  InstallMachine,
  type InstallMachineInput,
} from '@midnight-smoker/tarball-installer/install';
import {
  PackMachine,
  type PackMachineInput,
} from '@midnight-smoker/tarball-installer/pack';
import {ERROR, FINAL, OK, PARALLEL} from 'midnight-smoker/constants';
import {
  type Executor,
  type StaticPkgManagerSpec,
} from 'midnight-smoker/defs/executor';
import {
  type InstallManifest,
  type PkgManagerContext,
  type PkgManagerOpts,
} from 'midnight-smoker/defs/pkg-manager';
import {LifecycleError, MachineError} from 'midnight-smoker/error';
import {
  type AbortEvent,
  type ActorOutputError,
  type ActorOutputOk,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
  type MachineEvent,
  type SmokeMachinePkgManagerEvent,
} from 'midnight-smoker/machine';
import {type SmokerOptions} from 'midnight-smoker/options';
import {type WorkspaceInfo} from 'midnight-smoker/pkg-manager';
import {type PkgManagerEnvelope} from 'midnight-smoker/plugin';
import {
  assert,
  type FileManager,
  fromUnknownError,
  serialize,
  uniqueId,
} from 'midnight-smoker/util';
import {type Except} from 'type-fest';
import {
  type ActorRef,
  type ActorRefFromLogic,
  assign,
  enqueueActions,
  log,
  not,
  raise,
  setup,
  type Snapshot,
} from 'xstate';
import 'xstate/guards';

import {
  createPkgManagerContextLogic,
  destroyPkgManagerContextLogic,
  type DestroyPkgManagerContextLogicInput,
  type PkgManagerContextLogicInput,
} from './pkg-manager-context';
import {
  setupPkgManagerLogic,
  teardownPkgManagerLogic,
} from './pkg-manager-lifecycle';

export type PkgManagerMachineEvent =
  | AbortEvent
  | PkgManagerMachineHaltEvent
  | PkgManagerMachineStartEvent;

export type PkgManagerMachineHaltEvent = MachineEvent<'HALT'>;

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

export interface PkgManagerMachineContext
  extends Except<
    PkgManagerMachineInput,
    'workspaces',
    {requireExactProps: true}
  > {
  /**
   * Whether or not the machine has aborted
   */
  aborted?: boolean;

  /**
   * The base {@link Schema.PkgManagerContext} object for passing to the
   * {@link PackageManagerDef}'s operations
   */
  ctx?: Readonly<PkgManagerContext>;

  /**
   * Aggregate error object for any error occuring in this machine
   */
  error?: MachineError;
  installMachineRef?: ActorRefFromLogic<typeof InstallMachine>;
  installQueue: InstallManifest[];

  /**
   * Options for package manager behavior.
   *
   * Props will be included in {@link ctx}.
   */
  opts: PkgManagerOpts;
  packMachineRef?: ActorRefFromLogic<typeof PackMachine>;
  packQueue: WorkspaceInfo[];
  // /**
  //  * Static, event-ready view of {@link workspaces}.
  //  */
  // workspaceInfoResult: Result<WorkspaceInfo>[];

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
   * Options for the package manager
   */
  opts?: PkgManagerOpts;

  /**
   * The parent actor reference.
   *
   * Most events are sent to it.
   */
  parentRef?: ActorRef<Snapshot<unknown>, SmokeMachinePkgManagerEvent>;
  smokerOptions: SmokerOptions;

  /**
   * Information about one or more workspaces.
   *
   * If this contains a single item, then we either have one workspace _or_ are
   * not in a monorepo.
   */
  workspaces?: WorkspaceInfo[];
}

/**
 * Machine which controls how a `PkgManager` performs its operations.
 */
export const PkgManagerMachine = setup({
  actions: {
    abort: raise({type: 'ABORT'}),
    aborted: assign({aborted: true}),
    assignCtx: assign({
      ctx: (
        _,
        ctx?: Readonly<PkgManagerContext>,
      ): Readonly<PkgManagerContext> | undefined => ctx,
    }),
    assignError: assign({
      error: ({context, self}, {error: err}: {error: unknown}) => {
        const error = fromUnknownError(err);
        if (context.error) {
          // this is fairly rare. afaict it only happens
          // when both the teardown and pruneTempDir actors fail
          return context.error.cloneWith(error);
        }

        return new MachineError(
          `Package manager encountered an error`,
          error,
          self.id,
        );
      },
    }),
    enqueueAdditionalDeps: assign({
      installQueue: ({
        context: {
          ctx,
          installQueue,
          smokerOptions: {add: additionalDeps},
        },
      }) => {
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
      packQueue: ({context: {packQueue}}, workspaces: WorkspaceInfo[]) => [
        ...packQueue,
        ...workspaces,
      ],
    }),
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),
    spawnInstallMachine: assign({
      installMachineRef: ({
        context: {ctx, envelope, installMachineRef, installQueue},
        spawn,
      }) => {
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
      }) => {
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
    stopAllChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      for (const child of Object.keys(snapshot.children)) {
        enqueue.stopChild(child);
      }
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
  guards: {
    hasContext: ({context: {ctx}}) => !!ctx,
    hasError: ({context: {error}}) => !!error,
    hasPackItems: ({context: {packQueue}}) => !!packQueue.length,
    isAborted: ({context: {aborted}}) => !!aborted,
  },
  types: {
    context: {} as PkgManagerMachineContext,
    events: {} as PkgManagerMachineEvent,
    input: {} as PkgManagerMachineInput,
    output: {} as PkgManagerMachineOutput,
  },
}).createMachine({
  context: ({
    input: {
      envelope,
      opts: {loose = false, verbose = false} = {},
      smokerOptions,
      workspaces = [],
      ...input
    },
  }) => {
    const props = {
      installQueue: [],
      opts: {loose, verbose},
      packQueue: [...workspaces],
      spec: serialize(envelope.spec),
      // workspaceInfoResult: workspaces.map(toResult),
    } satisfies Partial<PkgManagerMachineContext>;

    return {
      ...input,
      envelope,
      smokerOptions,
      useWorkspaces: smokerOptions.all || !!smokerOptions.workspace.length,
      ...props,
    };
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
  initial: 'idle',
  on: {
    ABORT: {
      actions: [
        log(({context: {error}}) =>
          error ? `❌ ERROR: ${error?.message}` : 'aborting',
        ),
        'stopAllChildren',
        'aborted',
      ],
      guard: not('isAborted'),
      target: '.shutdown',
    },
  },
  output: ({
    context: {aborted, error},
    self: {id},
  }): PkgManagerMachineOutput => {
    // const noop = isEmpty(workspaceInfo);
    // TODO: Fix
    const noop = false;
    return error
      ? {aborted, actorId: id, error, noop, type: ERROR}
      : {aborted: false, actorId: id, noop, type: OK};
  },
  states: {
    done: {
      type: FINAL,
    },
    idle: {
      always: [
        {
          guard: 'hasPackItems',
          target: 'startup',
        },
        {
          actions: log('🛌 Idle; waiting for START'),
        },
      ],
      on: {
        HALT: {
          actions: log('🛑 Received HALT'),
          target: 'shutdown',
        },
        START: {
          actions: [
            log('👀 Received START'),
            {
              params: ({event: {workspaces}}) => workspaces,
              type: 'enqueuePackItems',
            },
          ],
        },
      },
    },
    shutdown: {
      entry: log('🛑 Shutting down'),
      initial: 'gate',
      onDone: 'done',
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
                params: () => undefined,
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
                  }) => ({
                    error: new LifecycleError(
                      error,
                      'teardown',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  }),
                  type: 'assignError',
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
            }) => {
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
                  }) => ({
                    error: new LifecycleError(
                      error,
                      'teardown',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  }),
                  type: 'assignError',
                },
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
      exit: [log('Startup complete')],
      initial: 'createPkgManagerContext',
      on: {
        HALT: {
          actions: log('🛑 Received HALT'),
          target: 'shutdown',
        },
      },
      onDone: 'working',
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
            }): PkgManagerContextLogicInput => ({
              executor,
              fileManager,
              options,
              spec,
              useWorkspaces,
            }),
            onDone: {
              actions: [
                {
                  params: ({event: {output}}) => output,
                  type: 'assignCtx',
                },
                log(
                  ({event: {output}}) =>
                    `🎁 Created package manager context with temp directory: ${output.tmpdir}`,
                ),
              ],
              target: 'setupLifecycle',
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
                  }) => ({
                    error: new LifecycleError(
                      error,
                      'setup',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  }),
                  type: 'assignError',
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
          entry: 'abort',
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
            }) => {
              assert.ok(ctx, 'Expected a PackageManagerContext');
              return {
                ctx,
                pkgManager,
              };
            },
            onDone: 'done',
            onError: {
              actions: [
                {
                  params: ({
                    context: {
                      envelope: {plugin},
                      spec: {label: spec},
                    },
                    event: {error},
                  }) => ({
                    error: new LifecycleError(
                      error,
                      'setup',
                      'pkg-manager',
                      spec,
                      plugin,
                    ),
                  }),
                  type: 'assignError',
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
      entry: [log('Working...'), 'enqueueAdditionalDeps'],
      on: {
        HALT: {
          actions: log('🛑 Received HALT'),
          target: 'shutdown',
        },
      },
      // we can start installing additional deps as soon as we have a tmpdir
      onDone: [
        {
          actions: log('⏪ Work complete; returning to idle'),
          target: 'idle',
        },
      ],
      states: {
        installing: {
          entry: ['spawnInstallMachine'],
        },
        packing: {
          entry: ['spawnPackMachine'],
        },
      },
      type: PARALLEL,
    },
  },
});
