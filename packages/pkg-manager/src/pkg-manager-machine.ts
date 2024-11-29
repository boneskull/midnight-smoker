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
  isEmpty,
  serialize,
  uniqueId,
} from 'midnight-smoker/util';
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

export type PkgManagerMachineOutput =
  | ActorOutputOk<{aborted: false; noop: boolean}>
  | PkgManagerMachineOutputError;

export type PkgManagerMachineOutputError = ActorOutputError<
  MachineError,
  {aborted?: boolean; noop: boolean}
>;

export interface PkgManagerMachineContext extends PkgManagerMachineInput {
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

  /**
   * Options for package manager behavior.
   *
   * Props will be included in {@link ctx}.
   */
  opts: PkgManagerOpts;

  packMachineRef?: ActorRefFromLogic<typeof PackMachine>;

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

export interface PkgManagerMachineHaltEvent {
  type: 'HALT';
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
 * @event
 */
export type PkgManagerMachineStartEvent = MachineEvent<
  'START',
  {
    workspaces: WorkspaceInfo[];
  }
>;

/**
 * Machine which controls how a `PkgManager` performs its operations.
 */
export const PkgManagerMachine = setup({
  actions: {
    abort: raise({type: 'ABORT'}),
    aborted: assign({aborted: true}),
    assignCtx: assign({
      ctx: (_, ctx: Readonly<PkgManagerContext>): Readonly<PkgManagerContext> =>
        ctx,
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
    assignWorkspaces: assign({
      workspaces: (_, workspaces: WorkspaceInfo[] = []) => workspaces,
    }),
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),
    spawnInstallMachine: assign({
      installMachineRef: ({
        context: {
          ctx,
          envelope,
          installMachineRef,
          smokerOptions: {add: additionalDeps},
        },
        spawn,
      }) => {
        assert.ok(!installMachineRef);
        assert.ok(ctx);

        const id = uniqueId({
          prefix: 'install-machine',
          suffix: envelope.spec.label,
        });

        const input: InstallMachineInput = {
          additionalDeps,
          ctx,
          envelope,
        };

        return spawn('InstallMachine', {
          id,
          input,
        });
      },
    }),
    spawnPackMachine: assign({
      packMachineRef: ({
        context: {ctx, envelope, installMachineRef, workspaces},
        spawn,
      }) => {
        assert.ok(!installMachineRef);
        assert.ok(ctx);

        const id = uniqueId({
          prefix: 'pack-machine',
          suffix: envelope.spec.label,
        });

        const input: PackMachineInput = {
          ctx,
          envelope,
          workspaces,
        };

        return spawn('PackMachine', {
          id,
          input,
        });
      },
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
    hasWorkspaces: ({context: {workspaces = []}}) => !!workspaces.length,
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
      opts: {loose, verbose},
      spec: serialize(envelope.spec),
      // workspaceInfoResult: workspaces.map(toResult),
    } satisfies Partial<PkgManagerMachineContext>;

    return {
      ...input,
      envelope,
      smokerOptions,
      useWorkspaces: smokerOptions.all || !!smokerOptions.workspace.length,
      workspaces,
      ...props,
    };
  },
  entry: [
    INIT_ACTION,
    log(({context: {spec, workspaces = []}}) => {
      let msg = `💡 PkgManagerMachine ${spec.label} starting up`;
      if (workspaces.length) {
        msg += ' with ${workspaces.length} workspace(s)';
      }
      return msg;
    }),
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
    context: {aborted, error, workspaces: workspaceInfo = []},
    self: {id},
  }): PkgManagerMachineOutput => {
    const noop = isEmpty(workspaceInfo);
    return error
      ? {aborted, actorId: id, error, noop, type: ERROR}
      : {aborted: false, actorId: id, noop, type: OK};
  },
  states: {
    done: {
      type: FINAL,
    },
    idle: {
      always: [{guard: 'hasWorkspaces', target: 'startup'}],
      on: {
        START: {
          actions: [
            {
              params: ({event: {workspaces}}) => workspaces,
              type: 'assignWorkspaces',
            },
          ],
        },
      },
    },
    shutdown: {
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
            onDone: 'teardownLifecycle',
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
              target: 'destroyPkgManagerContext',
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
      initial: 'createPkgManagerContext',
      on: {
        HALT: 'shutdown',
      },
      onDone: 'working',
      states: {
        createPkgManagerContext: {
          entry: [log('🎁 Creating package manager context')],
          invoke: {
            input: ({
              context: {
                executor,
                fileManager,
                opts: options,
                spec,
                useWorkspaces,
                workspaces,
              },
            }): PkgManagerContextLogicInput => ({
              executor,
              fileManager,
              options,
              spec,
              useWorkspaces,
              workspaces: workspaces!,
            }),
            onDone: {
              actions: [
                {
                  params: ({event: {output}}) => output,
                  type: 'assignCtx',
                },
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
      // we can start installing additional deps as soon as we have a tmpdir
      on: {
        HALT: 'shutdown',
      },
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
