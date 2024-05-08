import {ComponentKinds, RuleSeverities} from '#constants';
import {fromUnknownError} from '#error';
import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type SmokerOptions} from '#options';
import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PluginMetadata, type PluginRegistry} from '#plugin';
import {Rule, type RuleContext} from '#rule';
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
import {
  type PackageJson,
  type SetFieldType,
  type SetOptional,
  type SetRequired,
  type Simplify,
} from 'type-fest';
import {assign, log, not, setup} from 'xstate';
import {
  loadPkgManagers,
  readSmokerPackageJson,
  type LoadPkgManagersInput,
} from './reifier-machine-actors';

export const LoadableComponents = {
  All: 'all',
  PkgManagers: 'pkgManagers',
  Reporters: 'reporters',
  Rules: 'rules',
} as const;

export type LoadableComponent =
  (typeof LoadableComponents)[keyof typeof LoadableComponents];

export interface ReifierPkgManagerParams {
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

export interface BaseReifierMachineInput {
  plugin: Readonly<PluginMetadata>;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  pkgManager?: ReifierPkgManagerParams;
  component?: LoadableComponent;
  workspaceInfo: WorkspaceInfo[];
}

export type ReifierMachineInputForPkgManagers = Simplify<
  SetOptional<
    SetRequired<
      SetFieldType<
        BaseReifierMachineInput,
        'component',
        Extract<LoadableComponent, 'pkgManagers' | 'all'>
      >,
      'pkgManager'
    >,
    'component'
  >
>;

export type ReifierMachineInput =
  | BaseReifierMachineInput
  | ReifierMachineInputForPkgManagers;

export type ReifierMachineContext = ReifierMachineInput & {
  enabledReporterDefs: ReporterDef[];
  enabledRuleDefs: SomeRuleDef[];
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  reporterInitPayloads: ReporterInitPayload[];
  ruleInitPayloads: RuleInitPayload[];
  error?: Error;
  smokerPkgJson?: PackageJson;
  ruleDefsWithCtx?: RuleDefWithCtx[];
  rules?: SomeRule[];
};

export type ReifierMachineOutputOk = ActorOutputOk<{
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  reporterInitPayloads: ReporterInitPayload[];
  ruleInitPayloads: RuleInitPayload[];
}>;

export type ReifierMachineOutputError = ActorOutputError;

export type ReifierMachineOutput =
  | ReifierMachineOutputOk
  | ReifierMachineOutputError;

export interface LoadReportersInput {
  opts: SmokerOptions;
  pluginRegistry: PluginRegistry;
}

export interface RuleDefWithCtx {
  def: SomeRuleDef;
  ctx: RuleContext;
}

export const ReifierMachine = setup({
  types: {
    input: {} as ReifierMachineInput,
    context: {} as ReifierMachineContext,
    output: {} as ReifierMachineOutput,
  },
  actions: {
    assignError: assign({
      error: (_, {error}: {error: unknown}) => fromUnknownError(error),
    }),
    // reifyPkgManagers: assign({
    //   // TODO: maybe move side effects elsewhere
    //   pkgManagerDefs: ({context}) => {
    //     const {
    //       plugin,
    //       pluginRegistry,
    //       pkgManagerDefSpecsWithCtx = [],
    //     } = context;
    //     return pkgManagerDefSpecsWithCtx.map(({def, ctx}) => {
    //       const {id, componentName} = pluginRegistry.getComponent(def);
    //       const pkgManager = PkgManager.create(id, def, plugin, ctx);
    //       pluginRegistry.registerComponent(
    //         plugin,
    //         ComponentKinds.PkgManager,
    //         pkgManager,
    //         componentName,
    //       );
    //       return pkgManager;
    //     });
    //   },
    // }),

    /**
     * @todo Create `AggregateError` if `context.error` already set
     */
    creatingMissingPkgManagersError: assign({
      error: ({context}) =>
        context.error ?? new Error('No matching package managers'),
    }),

    // assignPkgManagerDefSpecsWithCtx: assign({
    //   pkgManagerDefSpecsWithCtx: (
    //     _,
    //     pkgManagerDefSpecsWithCtx: PkgManagerDefSpecsWithCtx[],
    //   ) => pkgManagerDefSpecsWithCtx,
    // }),

    assignEnabledReporterDefs: assign({
      enabledReporterDefs: ({context}) => {
        const {plugin, smokerOptions: smokerOpts} = context;
        return plugin.getEnabledReporterDefs(smokerOpts);
      },
    }),

    assignEnabledRuleDefs: assign({
      enabledRuleDefs: ({context}) => {
        const {plugin, smokerOptions: smokerOpts, pluginRegistry} = context;
        return [...plugin.ruleDefMap.values()].filter((def) => {
          const id = pluginRegistry.getComponentId(def);
          return smokerOpts.rules[id].severity !== RuleSeverities.Off;
        });
      },
    }),

    assignSmokerPkgJson: assign({
      smokerPkgJson: (_, pkgJson: PackageJson) => pkgJson,
    }),

    reifyRules: assign({
      rules: ({context}) => {
        const {
          plugin,
          pluginRegistry,
          enabledRuleDefs: ruleDefs = [],
        } = context;
        return ruleDefs.map((def) => {
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
      },
    }),
  },
  actors: {
    readSmokerPkgJson: readSmokerPackageJson,
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
  entry: [
    log(
      ({context: {component}}) => `Reifier loading component(s): ${component}`,
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
  }): ReifierMachineContext => {
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
      type: 'parallel',
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
                    assign({
                      pkgManagerInitPayloads: ({event: {output}}) => output,
                    }),
                  ],
                  target: '#Reifier.materializing.materializePkgManagers.done',
                },
                onError: {
                  actions: [
                    {
                      type: 'creatingMissingPkgManagersError',
                    },
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#Reifier.errored',
                },
              },
            },
            skipped: {
              entry: log('skipped pkg manager loading'),
              type: 'final',
            },
            done: {
              entry: log('done loading pkg managers'),
              type: 'final',
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
                  assign({
                    reporterInitPayloads: ({
                      context: {plugin, smokerOptions},
                    }) => {
                      const defs = plugin.getEnabledReporterDefs(smokerOptions);
                      return defs.map((def) => ({def, plugin}));
                    },
                  }),
                ],
                target: 'done',
              },
            },
            skipped: {
              entry: log('skipped reporter loading'),
              type: 'final',
            },
            done: {
              entry: log('done loading reporters'),
              type: 'final',
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
                  target: 'reifyRules',
                  actions: [log('reifying rules...')],
                },
                {
                  guard: not('shouldProcessRules'),
                  target: 'skipped',
                  actions: log('skipping rules'),
                },
              ],
            },
            reifyRules: {
              entry: [{type: 'reifyRules'}, log('done reifying rules')],
              type: 'final',
            },
            skipped: {
              entry: log('skipped rule creation'),
              type: 'final',
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
            pkgManagerInitPayloads = [],
            ruleInitPayloads = [],
            reporterInitPayloads = [],
          },
        }) =>
          `pkgManagers: ${pkgManagerInitPayloads.length}, rules: ${ruleInitPayloads.length} reporters: ${reporterInitPayloads.length}`,
      ),
      type: 'final',
    },

    errored: {
      type: 'final',
    },
  },
  output: ({
    self: {id},
    context: {
      pkgManagerInitPayloads,
      reporterInitPayloads = [],
      rules = [],
      error,
      plugin,
    },
  }) => {
    if (error) {
      return {error, type: 'ERROR', id};
    }
    return {
      pkgManagerInitPayloads,
      reporterInitPayloads,
      ruleInitPayloads: rules.map((rule) => ({plugin, rule})),
      type: 'OK',
      id,
    };
  },
  id: 'Reifier',
});
