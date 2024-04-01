import {and, assign, fromPromise, log, not, setup} from 'xstate';
import {type PluginRegistry} from '..';
import {
  PkgManager,
  type Executor,
  type PkgManagerContext,
  type PkgManagerDefSpec,
  type PkgManagerOpts,
  type PkgManagerSpec,
  type SomePkgManager,
} from '../component';
import {ComponentKinds} from '../constants';
import {fromUnknownError} from '../error';
import {type PluginMetadata} from '../plugin';
import {type FileManager} from '../util';

export interface PMPLInput {
  plugin: Readonly<PluginMetadata>;
  cwd: string;
  desiredPkgManagers: string[];
  fm: FileManager;
  systemExecutor: Executor;
  defaultExecutor: Executor;
  opts?: PkgManagerOpts;
  pluginRegistry: PluginRegistry;
}

export interface PMPLContext extends PMPLInput {
  pkgManagerDefSpecs?: PkgManagerDefSpec[];
  pkgManagers?: SomePkgManager[];
  error?: Error;
  pkgManagerDefSpecsWithCtx?: PkgManagerDefSpecsWithCtx[];
}

export type PMPLOutput =
  | {
      pkgManagers: SomePkgManager[];
    }
  | {
      error: Error;
    };

export type CreateContextsInput = Pick<
  PMPLContext,
  'pkgManagerDefSpecs' | 'fm' | 'systemExecutor' | 'defaultExecutor' | 'opts'
>;

export type PkgManagerDefSpecsWithCtx = PkgManagerDefSpec & {
  ctx: PkgManagerContext;
};

async function createPkgManagerContext({
  fm,
  spec,
  systemExecutor,
  defaultExecutor,
  opts,
}: {
  fm: FileManager;
  spec: PkgManagerSpec;
  systemExecutor: Executor;
  defaultExecutor: Executor;
  opts?: PkgManagerOpts;
}): Promise<PkgManagerContext> {
  const tmpdir = await fm.createTempDir(`${spec.pkgManager}-${spec.version}`);
  const executor = spec.isSystem ? systemExecutor : defaultExecutor;
  return {
    spec,
    tmpdir,
    executor,
    ...opts,
  };
}

export type LoadPkgManagersInput = Pick<
  PMPLContext,
  'plugin' | 'cwd' | 'desiredPkgManagers'
>;

export const pkgManagerPluginLoaderMachine = setup({
  types: {
    input: {} as PMPLInput,
    context: {} as PMPLContext,
    output: {} as PMPLOutput,
  },
  actions: {
    assignError: assign({
      error: ({event}) => {
        if ('error' in event && event.error) {
          return fromUnknownError(event.error);
        }
      },
    }),
    assignPkgManagers: assign({
      // TODO: maybe move side effects elsewhere
      pkgManagers: ({
        context: {pkgManagerDefSpecsWithCtx = [], pluginRegistry, plugin},
      }) =>
        pkgManagerDefSpecsWithCtx.map(({def, ctx}) => {
          const {id, componentName} = pluginRegistry.getComponent(def);
          pluginRegistry.registerComponent(
            plugin,
            ComponentKinds.PkgManager,
            def,
            componentName,
          );
          return PkgManager.create(id, def, plugin, ctx);
        }),
    }),
    eventLogger: log(({event}) => `received evt ${event.type}`),

    /**
     * @todo Create `AggregateError` if `context.error` already set
     */
    creatingMissingPkgManagersError: assign({
      error: ({context}) =>
        context.error ?? new Error('No matching package managers'),
    }),
  },
  actors: {
    loadPkgManagers: fromPromise<PkgManagerDefSpec[], LoadPkgManagersInput>(
      async ({input: {plugin, cwd, desiredPkgManagers}}) =>
        plugin.loadPkgManagers({
          cwd,
          desiredPkgManagers,
        }),
    ),
    createContexts: fromPromise<
      PkgManagerDefSpecsWithCtx[],
      CreateContextsInput
    >(
      async ({
        input: {pkgManagerDefSpecs, fm, systemExecutor, defaultExecutor, opts},
      }) => {
        if (pkgManagerDefSpecs?.length) {
          return Promise.all(
            pkgManagerDefSpecs.map(async ({spec, def}) => {
              const ctx = await createPkgManagerContext({
                fm,
                spec,
                systemExecutor,
                defaultExecutor,
                opts,
              });
              return {spec, def, ctx};
            }),
          );
        }
        throw new Error('No pkgManagerDefSpecs');
      },
    ),
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    hasPkgManagerDefSpecs: ({context: {pkgManagerDefSpecs}}) =>
      Boolean(pkgManagerDefSpecs?.length),
    hasPkgManagerDefSpecsWithCtx: ({context: {pkgManagerDefSpecsWithCtx}}) =>
      Boolean(pkgManagerDefSpecsWithCtx?.length),
    hasPkgManagers: ({context: {pkgManagers}}) => Boolean(pkgManagers?.length),
    notHasPkgManagerDefSpecs: not('hasPkgManagerDefSpecs'),
    notHasError: not('hasError'),
    notHasPkgManagerDefSpecsWithCtx: not('hasPkgManagerDefSpecsWithCtx'),
    succeeded: and(['hasPkgManagers', not('hasError')]),
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QAcDWUCyBDAdlmATgAoA2ArlAJY4AyA9lhGAQMQBUA2gAwC6iKdWJQAulOjn4gAHogCcAZgBsAOgCMAFgAc6xZq6qA7AFYDm1QBoQAT0Sql85Yq4LNmxatXbNAX2+W0mLj4zKQU1PSMzMokDBDUUCwQ4mDK1ABudKgpAdh4hKFUtLFRMYzxCOl0AMZYouLcPA2SyIIiYhJI0ogATLKaymbdRpY2CGbKRlxTdu6eWqpGvv7oucHE5IURTATRsfEszAR0O8gktQBmxwC2yjlB+RvhxTulcThQFTgZNXU4DU2dFpCX6SGQIVSKAzKdTdZzydRcRTqWQLWQGEa2KayZQGFHdboeIyKeFGbpLEB3PIhR5FSI7NJYEiUCC1eIAETA5wAysgwFVYCwAQJge1QT1NFD5EYFMYMQgDAtlCjcZpuko5mZyZS1gUnnTlAymSzRO8OdzefzBao+IDWiDOmDuhLlFKZcNrIgDO4lYY+mr3F5VFqVvdqWFadtlFdasxKIzKAAvfZJHApWDCGO3ENU9bhrZRaPCWPxpPvIUUu2ih2ISFy1RO7oDaXyVyzLzBwI53URgsxghxpmlqDKKoEMCs94AYXERakwgFKZSlSyWc7Opp+Z2heLg-iI7HE6g05ws-nn2+rPqvHLQLa4jFY2RSqM8nr7tGkK4EyU6gVsnURieAsHarA8ebPFGfYDome6juOJpHjOYBzgKhzHLcZzCJcBA3NqYGbBB279iWsEHghx6nrA57VJefzXrwzSVve1aPtisgvm+cpmP0voGPoHgakGfgUtm67gfqRHQUOBrxsa8REKJhACjeTEdKAYL1qYEymJ4ThSgsijdHKxKqDiXCvi2bbzCBoa5gRElQSR7wyUah4KWuSlWjawp3mpXTgt0WkmNxemAUSRkeggkJQnxFluB4ga+MJOB0Ew8CAopYb2dsjEisx6lyHKAC0RhKrI5WuN06jyASiiyN0ig2V2G4Qa88S5b5D4mHWXBQrCcVWWYizCXhWV6pGhrMoeZo8ny6U+faBUIPVcoGLCEzaEishcE6gFaE1YnZb2RbEbu7wdYt-kmCo+jhe+iCATF5mqHCqqmPoB34eNx07jBzlwYeFHIfOF1VkthnqMot2GfdYw7Wo4XEoNQnLB5Y09lujlncOk1ye87mgcw80VnlfkaVwL5Nm6xn1coDXyOZ6hM4BQ2fejm6QSdUl7mhY4QKD+X+RCNUuk6unmWFhlcQzSqaOxsh1QBQHyGzdnfZjXNOcOAMIQTtnE7el0acSjY1SFEsGRFH4U3Tz2WQl1kjZlasY8oi4C2TtjjJCniypF9Z6I4r3xRqqvdhzvOQB7D6-lChIKC9qgonV6L+4n0JVTCLa9ciEJJd4QA
   */
  context: ({input}) => ({
    ...input,
  }),
  initial: 'loading',
  on: {
    '*': {
      actions: ['eventLogger'],
    },
  },
  states: {
    loading: {
      invoke: {
        src: 'loadPkgManagers',
        input: ({context}) => context,
        onDone: {
          target: 'validatingDefSpecs',
          actions: [
            assign({
              pkgManagerDefSpecs: ({event: {output: pkgManagerDefSpecs}}) =>
                pkgManagerDefSpecs,
            }),
            log(
              ({context: {pkgManagerDefSpecs}}) =>
                `found ${pkgManagerDefSpecs?.length ?? 0} def/spec pairs`,
            ),
          ],
        },
        onError: {
          actions: ['assignError'],
          target: 'errored',
        },
      },
    },
    validatingDefSpecs: {
      always: [
        {
          target: 'materializing',
          guard: 'hasPkgManagerDefSpecs',
        },
        {
          target: 'errored',
          guard: 'notHasPkgManagerDefSpecs',
          actions: ['creatingMissingPkgManagersError'],
        },
      ],
    },
    materializing: {
      initial: 'creatingContexts',
      states: {
        creatingContexts: {
          invoke: {
            src: 'createContexts',
            input: ({
              context: {
                pkgManagerDefSpecs,
                fm,
                systemExecutor,
                defaultExecutor,
                opts,
              },
            }) => ({
              pkgManagerDefSpecs,
              fm,
              systemExecutor,
              defaultExecutor,
              opts,
            }),
            onDone: {
              actions: [
                assign({
                  pkgManagerDefSpecsWithCtx: ({
                    event: {output: pkgManagerDefSpecsWithCtx},
                  }) => pkgManagerDefSpecsWithCtx,
                }),
              ],
              target: 'validatingPkgManagers',
            },
            onError: {
              actions: ['assignError'],
              target: 'errored',
            },
          },
        },
        validatingPkgManagers: {
          always: [
            {
              guard: 'hasPkgManagerDefSpecsWithCtx',
              target: 'creatingPkgManagers',
            },
            {
              guard: 'notHasPkgManagerDefSpecsWithCtx',
              actions: ['creatingMissingPkgManagersError'],
              target: 'errored',
            },
          ],
        },
        errored: {
          type: 'final',
        },
        creatingPkgManagers: {
          type: 'final',
          entry: ['assignPkgManagers'],
        },
      },
      onDone: {
        target: 'done',
      },
    },

    done: {
      guard: ['suceeeded'],
      type: 'final',
    },

    errored: {
      type: 'final',
    },
  },
  output: ({context: {pkgManagers, error}}) => {
    if (pkgManagers) {
      return {pkgManagers};
    }
    if (error) {
      return {error};
    }
    return {error: new Error('No PkgManagers were created')};
  },
  id: 'pkgManagerPluginLoader',
});
