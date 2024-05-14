import {ComponentKinds} from '#constants';
import {fromUnknownError} from '#error';
import {
  ERROR,
  FINAL,
  OK,
  PARALLEL,
  type ActorOutputError,
  type ActorOutputOk,
} from '#machine/util';
import {type SmokerOptions} from '#options';
import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PluginMetadata, type PluginRegistry} from '#plugin';
import {Rule} from '#rule';
import {
  type Executor,
  type PkgManagerDef,
  type PkgManagerOpts,
  type ReporterDef,
  type SomeRule,
  type SomeRuleDef,
  type WorkspaceInfo,
} from '#schema';
import {type FileManager} from '#util';
import assert from 'node:assert';
import {type PackageJson} from 'type-fest';
import {assign, log, not, setup} from 'xstate';
import {
  loadPkgManagers,
  type LoadPkgManagersInput,
} from './loader-machine-actors';

export const LoadableComponents = {
  All: 'all',
  PkgManagers: 'pkgManagers',
  Reporters: 'reporters',
  Rules: 'rules',
} as const;

export type LoadableComponent =
  (typeof LoadableComponents)[keyof typeof LoadableComponents];

export interface LoaderPkgManagerParams {
  fm: FileManager;
  cwd?: string;
  defaultExecutor?: Executor;
  systemExecutor?: Executor;
  pkgManagerOpts?: PkgManagerOpts;
}

export interface BaseInitPayload {
  plugin: Readonly<PluginMetadata>;
}

export interface PkgManagerInitPayload extends BaseInitPayload {
  def: PkgManagerDef;
  spec: PkgManagerSpec;
}

export interface ReporterInitPayload extends BaseInitPayload {
  def: ReporterDef;
}

export interface RuleInitPayload extends BaseInitPayload {
  rule: SomeRule;
}

export interface BaseLoaderMachineInput {
  plugin: Readonly<PluginMetadata>;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  pkgManager?: LoaderPkgManagerParams;
  component?: LoadableComponent;
  workspaceInfo: WorkspaceInfo[];
}

/**
 * If package managers are to be loaded, we expect
 * {@link BaseLoaderMachineInput.pkgManager} to truthy
 */
export interface LoaderMachineInputForPkgManagers
  extends BaseLoaderMachineInput {
  component: 'pkgManagers' | 'all';
  pkgManager: LoaderPkgManagerParams;
}

export type LoaderMachineInput =
  | BaseLoaderMachineInput
  | LoaderMachineInputForPkgManagers;

export type LoaderMachineContext = LoaderMachineInput & {
  enabledReporterDefs: ReporterDef[];
  enabledRuleDefs: SomeRuleDef[];
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  reporterInitPayloads: ReporterInitPayload[];
  ruleInitPayloads: RuleInitPayload[];
  error?: Error;
  smokerPkgJson?: PackageJson;
  rules?: SomeRule[];
};

export type LoaderMachineOutputOk = ActorOutputOk<{
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  reporterInitPayloads: ReporterInitPayload[];
  ruleInitPayloads: RuleInitPayload[];
}>;

export type LoaderMachineOutputError = ActorOutputError;

export type LoaderMachineOutput =
  | LoaderMachineOutputOk
  | LoaderMachineOutputError;

export const LoaderMachine = setup({
  types: {
    input: {} as LoaderMachineInput,
    context: {} as LoaderMachineContext,
    output: {} as LoaderMachineOutput,
  },
  actions: {
    assignError: assign({
      error: (_, {error}: {error: unknown}) => fromUnknownError(error),
    }),

    assignRuleInitPayloads: assign({
      ruleInitPayloads: ({
        context: {plugin, pluginRegistry, enabledRuleDefs: ruleDefs = []},
      }) => {
        const rules = ruleDefs.map((def) => {
          const {id, componentName} = pluginRegistry.getComponent(def);
          const rule = Rule.create(id, def, plugin);
          pluginRegistry.registerComponent(
            plugin,
            ComponentKinds.Rule,
            rule,
            rule.name ?? componentName,
          );
          return rule;
        });
        assert.ok(rules);
        return rules.map((rule) => ({rule, plugin}));
      },
    }),

    assignReporterInitPayloads: assign({
      reporterInitPayloads: ({context: {plugin, smokerOptions}}) => {
        const defs = plugin.getEnabledReporterDefs(smokerOptions);
        return defs.map((def) => ({def, plugin}));
      },
    }),

    assignPkgManagerInitPayloads: assign({
      pkgManagerInitPayloads: (_, payloads: PkgManagerInitPayload[]) =>
        payloads,
    }),
  },
  actors: {
    loadPkgManagers,
  },
  guards: {
    hasError: ({context: {error}}) => Boolean(error),
    notHasError: not('hasError'),
    shouldProcessPkgManagers: ({context: {component}}) =>
      component === LoadableComponents.All ||
      component === LoadableComponents.PkgManagers,
    shouldProcessReporters: ({context: {component}}) =>
      component === LoadableComponents.All ||
      component === LoadableComponents.Reporters,
    shouldProcessRules: ({context: {component}}) =>
      component === LoadableComponents.All ||
      component === LoadableComponents.Rules,
  },
}).createMachine({
  description:
    'Pulls package managers, reporters and rules out of plugins and readies them for use; any combination of components may be requested',
  entry: [
    log(
      ({context: {component}}) => `Loader loading component(s): ${component}`,
    ),
  ],
  always: {
    guard: 'hasError',
    actions: [log(({context: {error}}) => `ERROR: ${error?.message}`)],
  },
  context: ({
    input: {
      component = LoadableComponents.All,
      plugin,
      pluginRegistry,
      smokerOptions: smokerOpts,
      ...input
    },
  }): LoaderMachineContext => {
    const enabledReporterDefs = plugin.getEnabledReporterDefs(smokerOpts);
    const enabledRuleDefs = plugin.getEnabledRuleDefs(smokerOpts);

    return {
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
      component,
      plugin,
      pluginRegistry,
      smokerOptions: smokerOpts,
      ...input,
      enabledReporterDefs,
      enabledRuleDefs,
    };
  },
  initial: 'materializing',
  states: {
    materializing: {
      type: PARALLEL,
      states: {
        materializePkgManagers: {
          initial: 'gate',
          states: {
            gate: {
              always: [
                {
                  guard: 'shouldProcessPkgManagers',
                  target: 'loadingPkgManagers',
                  actions: [log('loading pkg managers...')],
                },
                {
                  guard: not('shouldProcessPkgManagers'),
                  target: 'skipped',
                  actions: [log('skipping pkg manager loading')],
                },
              ],
            },
            loadingPkgManagers: {
              invoke: {
                src: 'loadPkgManagers',
                input: ({context}): LoadPkgManagersInput => {
                  const {
                    plugin,
                    smokerOptions: smokerOpts,
                    pkgManager,
                  } = context;
                  assert.ok(pkgManager);
                  const {cwd} = pkgManager;
                  return {
                    cwd,
                    plugin,
                    smokerOpts,
                  };
                },
                onDone: {
                  actions: [
                    {
                      type: 'assignPkgManagerInitPayloads',
                      params: ({event: {output}}) => output,
                    },
                  ],
                  target:
                    '#LoaderMachine.materializing.materializePkgManagers.done',
                },
                onError: {
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#LoaderMachine.errored',
                },
              },
            },
            skipped: {
              entry: log('skipped pkg manager loading'),
              type: FINAL,
            },
            done: {
              entry: log('done loading pkg managers'),
              type: FINAL,
            },
          },
        },

        materializeReporters: {
          initial: 'gate',
          states: {
            gate: {
              always: [
                {
                  guard: 'shouldProcessReporters',
                  target: 'loadingReporters',
                  actions: [log('loading reporters...')],
                },
                {
                  guard: not('shouldProcessReporters'),
                  target: 'skipped',
                  actions: [log('skipping reporter loading')],
                },
              ],
            },
            loadingReporters: {
              always: {
                actions: [
                  {
                    type: 'assignReporterInitPayloads',
                  },
                ],
                target: 'done',
              },
            },
            skipped: {
              entry: log('skipped reporter loading'),
              type: FINAL,
            },
            done: {
              entry: log('done loading reporters'),
              type: FINAL,
            },
          },
        },
        materializeRules: {
          initial: 'gate',
          states: {
            gate: {
              always: [
                {
                  guard: 'shouldProcessRules',
                  target: 'loadingRules',
                  actions: [log('loading rules...')],
                },
                {
                  guard: not('shouldProcessRules'),
                  target: 'skipped',
                  actions: log('skipping rules'),
                },
              ],
            },
            loadingRules: {
              entry: [
                {type: 'assignRuleInitPayloads'},
                log('done loading rules'),
              ],
              type: FINAL,
            },
            skipped: {
              entry: log('skipped rule creation'),
              type: FINAL,
            },
          },
        },
      },
      onDone: [
        {
          guard: not('hasError'),
          target: 'done',
          actions: log('materializing complete'),
        },
        {
          guard: 'hasError',
          target: 'errored',
          actions: log('materializing errored'),
        },
      ],
    },

    done: {
      entry: log(
        ({
          context: {
            pkgManagerInitPayloads,
            ruleInitPayloads,
            reporterInitPayloads,
          },
        }) =>
          `pkgManagers: ${pkgManagerInitPayloads.length}, rules: ${ruleInitPayloads.length} reporters: ${reporterInitPayloads.length}`,
      ),
      type: FINAL,
    },

    errored: {
      type: FINAL,
    },
  },
  output: ({
    self: {id},
    context: {
      pkgManagerInitPayloads,
      reporterInitPayloads,
      ruleInitPayloads,
      error,
    },
  }) =>
    error
      ? {error, type: ERROR, id}
      : {
          pkgManagerInitPayloads,
          reporterInitPayloads,
          ruleInitPayloads,
          type: OK,
          id,
        },
  id: 'LoaderMachine',
});
