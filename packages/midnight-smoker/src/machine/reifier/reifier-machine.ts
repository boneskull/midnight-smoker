import {
  ComponentKinds,
  DEFAULT_EXECUTOR_ID,
  RuleSeverities,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {fromUnknownError} from '#error';
import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type SmokerOptions} from '#options';
import {PkgManager} from '#pkg-manager';
import {type PluginMetadata, type PluginRegistry} from '#plugin';
import {Reporter, type SomeReporter} from '#reporter';
import {Rule, type RuleContext} from '#rule';
import {
  type Executor,
  type PkgManagerDefSpec,
  type PkgManagerOpts,
  type ReporterDef,
  type SomeRule,
  type SomeRuleDef,
  type WorkspaceInfo,
} from '#schema';
import {type FileManager} from '#util';
import {isEmpty} from 'lodash';
import assert from 'node:assert';
import {
  type PackageJson,
  type SetFieldType,
  type SetOptional,
  type SetRequired,
  type Simplify,
} from 'type-fest';
import {and, assign, log, not, setup} from 'xstate';
import {
  createPkgManagerContexts,
  createReporterContexts,
  loadPkgManagers,
  readSmokerPackageJson,
  type CreatePkgManagerContextsInput,
  type CreateReporterContextsInput,
  type LoadPkgManagersInput,
  type PkgManagerDefSpecsWithCtx,
  type ReporterDefWithCtx,
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

export interface BaseReifierInput {
  plugin: Readonly<PluginMetadata>;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  pkgManager?: ReifierPkgManagerParams;
  component?: LoadableComponent;
  workspaceInfo: WorkspaceInfo[];
}

export type ReifierInputForPkgManagers = Simplify<
  SetOptional<
    SetRequired<
      SetFieldType<
        BaseReifierInput,
        'component',
        Extract<LoadableComponent, 'pkgManagers' | 'all'>
      >,
      'pkgManager'
    >,
    'component'
  >
>;

export type ReifierInput = BaseReifierInput | ReifierInputForPkgManagers;

export type ReifierContext = ReifierInput & {
  enabledReporterDefs: ReporterDef[];
  enabledRuleDefs: SomeRuleDef[];
  pkgManagerDefSpecs?: PkgManagerDefSpec[];
  pkgManagers?: PkgManager[];
  error?: Error;
  pkgManagerDefSpecsWithCtx?: PkgManagerDefSpecsWithCtx[];
  smokerPkgJson?: PackageJson;
  reporterDefsWithCtx?: ReporterDefWithCtx[];
  reporters?: SomeReporter[];
  ruleDefsWithCtx?: RuleDefWithCtx[];
  rules?: SomeRule[];
};

export type ReifierOutputOk = ActorOutputOk<{
  pkgManagers: PkgManager[];
  reporters: SomeReporter[];
  rules: SomeRule[];
}>;

export type ReifierOutputError = ActorOutputError;

export type ReifierOutput = ReifierOutputOk | ReifierOutputError;

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
    input: {} as ReifierInput,
    context: {} as ReifierContext,
    output: {} as ReifierOutput,
  },
  actions: {
    assignWorkspaces: assign({
      workspaceInfo: (_, workspaces: WorkspaceInfo[]) => workspaces,
    }),
    assignError: assign({
      error: (_, {error}: {error: unknown}) => fromUnknownError(error),
    }),
    assignPkgManagers: assign({
      // TODO: maybe move side effects elsewhere
      pkgManagers: ({context}) => {
        const {
          plugin,
          pluginRegistry,
          pkgManagerDefSpecsWithCtx = [],
        } = context;
        return pkgManagerDefSpecsWithCtx.map(({def, ctx}) => {
          const {id, componentName} = pluginRegistry.getComponent(def);
          const pkgManager = PkgManager.create(id, def, plugin, ctx);
          pluginRegistry.registerComponent(
            plugin,
            ComponentKinds.PkgManager,
            pkgManager,
            componentName,
          );
          return pkgManager;
        });
      },
    }),

    /**
     * @todo Create `AggregateError` if `context.error` already set
     */
    creatingMissingPkgManagersError: assign({
      error: ({context}) =>
        context.error ?? new Error('No matching package managers'),
    }),
    assignPkgManagerDefSpecs: assign({
      pkgManagerDefSpecs: (_, pkgManagerDefSpecs: PkgManagerDefSpec[]) =>
        pkgManagerDefSpecs,
    }),

    assignPkgManagerDefSpecsWithCtx: assign({
      pkgManagerDefSpecsWithCtx: (
        _,
        pkgManagerDefSpecsWithCtx: PkgManagerDefSpecsWithCtx[],
      ) => pkgManagerDefSpecsWithCtx,
    }),

    assignEnabledReporterDefs: assign({
      enabledReporterDefs: ({context}) => {
        const {plugin, pluginRegistry, smokerOptions: smokerOpts} = context;
        return plugin.getEnabledReporterDefs(
          smokerOpts,
          pluginRegistry.getComponentId.bind(pluginRegistry),
        );
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

    assignReporterDefsWithCtx: assign({
      reporterDefsWithCtx: (_, reporterDefsWithCtx: ReporterDefWithCtx[]) =>
        reporterDefsWithCtx,
    }),

    assignReporters: assign({
      reporters: ({context}) => {
        const {plugin, pluginRegistry, reporterDefsWithCtx = []} = context;
        return reporterDefsWithCtx.map(({def, ctx}) => {
          const {id, componentName} = pluginRegistry.getComponent(def);
          const reporter = Reporter.create(id, def, plugin, ctx);
          pluginRegistry.registerComponent(
            plugin,
            ComponentKinds.Reporter,
            reporter,
            componentName,
          );
          return reporter;
        });
      },
    }),
    createRules: assign({
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
    createReporterContexts,
    createPkgManagerContexts,
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
    succeeded: and(['hasPkgManagers', not('hasError'), 'hasReporters']),
    hasReporters: ({context: {reporters}}) => Boolean(reporters?.length),
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
  context: ({
    input: {
      component = LoadableComponents.All,
      plugin,
      pluginRegistry,
      smokerOptions: smokerOpts,
      ...input
    },
  }): ReifierContext => {
    const getId = pluginRegistry.getComponentId.bind(pluginRegistry);

    const enabledReporterDefs = plugin.getEnabledReporterDefs(
      smokerOpts,
      getId,
    );
    const enabledRuleDefs = plugin.getEnabledRuleDefs(smokerOpts, getId);

    return {
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
                },
                {guard: not('shouldProcessPkgManagers'), target: 'skipped'},
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
                  target: 'creatingPkgManagerContexts',
                  actions: [
                    {
                      type: 'assignPkgManagerDefSpecs',
                      params: ({event: {output: pkgManagerDefSpecs}}) =>
                        pkgManagerDefSpecs,
                    },
                  ],
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
            // queryWorkspaces: {
            //   invoke: {
            //     src: 'queryWorkspaces',
            //     input: ({context: {smokerOpts, pkgManager}}) => {
            //       assert.ok(pkgManager);
            //       return {
            //         cwd: smokerOpts.cwd,
            //         fm: pkgManager.fm,
            //         includeRoot: smokerOpts.includeRoot,
            //       };
            //     },
            //     onDone: {
            //       actions: [
            //         {
            //           type: 'assignWorkspaces',
            //           params: ({event: {output: workspaces}}) => workspaces,
            //         },
            //       ],
            //       target: 'creatingPkgManagerContexts',
            //     },
            //     onError: {
            //       actions: [
            //         {
            //           type: 'assignError',
            //           params: ({event: {error}}) => ({error}),
            //         },
            //       ],
            //       target: '#Reifier.errored',
            //     },
            //   },
            // },
            creatingPkgManagerContexts: {
              invoke: {
                src: 'createPkgManagerContexts',
                input: ({context}): CreatePkgManagerContextsInput => {
                  const {
                    pkgManager,
                    pkgManagerDefSpecs,
                    pluginRegistry,
                    workspaceInfo,
                    smokerOptions,
                  } = context;
                  assert.ok(pkgManager);
                  assert.ok(pkgManagerDefSpecs);
                  const {
                    fm,
                    systemExecutor = pluginRegistry.getExecutor(
                      SYSTEM_EXECUTOR_ID,
                    ),
                    defaultExecutor = pluginRegistry.getExecutor(
                      DEFAULT_EXECUTOR_ID,
                    ),
                    pkgManagerOpts,
                  } = pkgManager;

                  const useWorkspaces =
                    smokerOptions.all || !isEmpty(smokerOptions.workspace);

                  return {
                    useWorkspaces,
                    pkgManagerDefSpecs,
                    fm,
                    systemExecutor,
                    defaultExecutor,
                    pkgManagerOpts,
                    workspaceInfo,
                  };
                },
                onDone: {
                  actions: [
                    {
                      type: 'assignPkgManagerDefSpecsWithCtx',
                      params: ({event: {output: pkgManagerDefSpecsWithCtx}}) =>
                        pkgManagerDefSpecsWithCtx,
                    },
                  ],
                  target: 'validatingPkgManagers',
                },
                onError: {
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#Reifier.errored',
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
                  target: '#Reifier.errored',
                },
              ],
            },
            creatingPkgManagers: {
              type: 'final',
              entry: ['assignPkgManagers', log('created pkg managers')],
            },
            skipped: {
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
                  target: 'readingSmokerPkgJson',
                },
                {guard: not('shouldProcessReporters'), target: 'skipped'},
              ],
            },
            readingSmokerPkgJson: {
              invoke: {
                src: 'readSmokerPkgJson',
                onDone: {
                  actions: [
                    {
                      type: 'assignSmokerPkgJson',
                      params: ({event: {output: smokerPkgJson}}) => ({
                        smokerPkgJson,
                      }),
                    },
                  ],
                  target: 'creatingReporterContexts',
                },
                onError: {
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#Reifier.errored',
                },
              },
            },
            creatingReporterContexts: {
              invoke: {
                src: 'createReporterContexts',
                input: ({
                  context: {
                    smokerOptions: smokerOpts,
                    enabledReporterDefs,
                    smokerPkgJson,
                  },
                }): CreateReporterContextsInput => {
                  assert.ok(smokerPkgJson);
                  return {
                    reporterDefs: enabledReporterDefs,
                    smokerOpts,
                    pkgJson: smokerPkgJson,
                  };
                },
                onDone: {
                  actions: [
                    {
                      type: 'assignReporterDefsWithCtx',
                      params: ({event: {output: reporterDefsWithCtx}}) =>
                        reporterDefsWithCtx,
                    },
                  ],
                  target: 'creatingReporters',
                },
                onError: {
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: '#Reifier.errored',
                },
              },
            },
            creatingReporters: {
              guard: {type: 'hasReporters'},
              entry: [log('creating reporters'), {type: 'assignReporters'}],
              type: 'final',
            },
            skipped: {
              entry: log('skipping reporter creation'),
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
                  target: 'createRules',
                },
                {guard: not('shouldProcessRules'), target: 'skipped'},
              ],
            },
            createRules: {
              entry: [{type: 'createRules'}],
              type: 'final',
            },
            skipped: {
              entry: log('skipping rule creation'),
              type: 'final',
            },
          },
        },
      },
      onDone: [
        {
          guard: not('hasError'),
          target: 'done',
        },
        {
          guard: 'hasError',
          target: 'errored',
        },
      ],
    },

    done: {
      type: 'final',
    },

    errored: {
      type: 'final',
    },
  },
  output: ({
    self: {id},
    context: {pkgManagers = [], reporters = [], rules = [], error},
  }) => {
    if (error) {
      return {error, type: 'ERROR', id};
    }
    return {reporters, pkgManagers, rules, type: 'OK', id};
  },
  id: 'Reifier',
});
