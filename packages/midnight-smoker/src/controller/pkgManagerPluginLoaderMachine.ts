import {assign, fromPromise, log, sendParent, setup} from 'xstate';
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
import {type PluginMetadata} from '../plugin';
import {type FileManager} from '../util';

export type PkgManagerPluginLoaderContext = {
  plugin: Readonly<PluginMetadata>;
  cwd: string;
  desiredPkgManagers: string[];
  pkgManagerDefSpecs: PkgManagerDefSpec[];
  pkgManagers: SomePkgManager[];
  fm: FileManager;
  systemExecutor: Executor;
  defaultExecutor: Executor;
  opts?: PkgManagerOpts;
  pluginRegistry: PluginRegistry;
};

export type CreateContextsInput = Pick<
  PkgManagerPluginLoaderContext,
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

export const pkgManagerPluginLoaderMachine = setup({
  types: {
    input: {} as Omit<
      PkgManagerPluginLoaderContext,
      'pkgManagerDefSpecs' | 'pkgManagers' | 'debug'
    >,
    context: {} as PkgManagerPluginLoaderContext,
  },
  actors: {
    loadPkgManagers: fromPromise<
      PkgManagerDefSpec[],
      PkgManagerPluginLoaderContext
    >(async ({input: {plugin, cwd, desiredPkgManagers}}) =>
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
      }) =>
        Promise.all(
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
        ),
    ),
  },
  guards: {
    hasPkgManagerDefSpecs: ({context: {pkgManagerDefSpecs}}) =>
      pkgManagerDefSpecs.length > 0,
    hasPkgManagers: ({context: {pkgManagers}}) => pkgManagers.length > 0,
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QAcDWUCyBDAdlmATgAoA2ArlAJY4AyA9lhGAQHQkMTVQDEEdOYFtQBudVILSZc+ZqQrV6jZmw5cEIugGMsAF0r8A2gAYAusZOIUdWJT39LIAB6IAtAFYAjADYWHjwGYAJgAOD0C3ABoQAE9XDwAWYJYvePi3fzC3AF8sqMlsPEI5KloOZU0CMF0uAGF+HTBHHVhefkENcRZ86SLyEsUmVgqqvRwoOpwGpth1HFFtOxxzcwdka1t9HAdnBD94lkD-I3ivYIB2SJi4xOTU9Myc3JAcOiZ4JBBuwtk+hTKCVbrRbbVzBIxuFgATnCZ1C4SisQQLkOZyhHjOkNOFxyeXQBRkxF+pSUrHYjC4gJswI+OxcF1R0LcsMyCLibiMLHi6Mx52yTy+BOKfxJLGG1TGEymzUpG3sNLifhYZyMyoy8KuSI87M53KxfNxUm+hPkxMGosqukgksa0o+aypmxBCH8wX8LGCgXigQ8vNZmpCvi8GL1jyyQA
   */
  context: ({input}) => ({
    ...input,
    pkgManagerDefSpecs: [],
    pkgManagers: [],
  }),
  initial: 'loading',
  on: {
    '*': {
      actions: log(({event}) => `received evt ${event.type}`),
    },
  },
  states: {
    loading: {
      entry: [log('loading')],
      invoke: {
        src: 'loadPkgManagers',
        input: ({context}) => context,
        onDone: {
          target: 'creatingContexts',
          actions: [
            assign({
              pkgManagerDefSpecs: ({event}) => event.output,
            }),
            log(
              ({context: {pkgManagerDefSpecs}}) =>
                `found ${pkgManagerDefSpecs.length} def/spec pairs`,
            ),
          ],
        },
        onError: {
          actions: ({event: {error}}) => {
            log(`error loading pkg managers: ${error}`);
          },
        },
      },
    },
    creatingContexts: {
      guard: 'hasPkgManagerDefSpecs',
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
          target: 'createdContexts',
          actions: [
            assign({
              pkgManagers: ({
                context: {pluginRegistry, plugin},
                event: {output: pkgManagerDefSpecsWithCtx},
              }) => {
                return pkgManagerDefSpecsWithCtx.map(({def, ctx}) => {
                  const {id, componentName} = pluginRegistry.getComponent(def);
                  pluginRegistry.registerComponent(
                    plugin,
                    ComponentKinds.PkgManager,
                    def,
                    componentName,
                  );
                  return PkgManager.create(id, def, plugin, ctx);
                });
              },
            }),
            log(
              ({context: {pkgManagers}}) =>
                `created ${pkgManagers.length} PkgManagers`,
            ),
          ],
        },
      },
    },
    createdContexts: {
      guard: 'hasPkgManagers',
      entry: [
        sendParent(({self, context: {pkgManagers}}) => ({
          type: 'PLUGINS_LOADED',
          sender: self.id,
          pkgManagers,
        })),
        log('sent PLUGINS_LOADED'),
      ],
      type: 'final',
    },
  },
  output: ({context: {pkgManagers}}) => pkgManagers,
  id: 'pkgManagerPluginLoader',
});
