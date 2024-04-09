import {ReporterController} from '#controller';
import {type SmokerOptions} from '#options';
import {type PluginRegistry} from '#plugin';
import {Reporter, type SomeReporter} from '#reporter/reporter';
import {Rule} from '#rule/rule';
import {type SomeRule, type SomeRuleDef} from '#schema';
import {type PackageJson} from 'type-fest';
import {and, assign, fromPromise, log, not, setup} from 'xstate';
import {
  PkgManager,
  type Executor,
  type PkgManagerContext,
  type PkgManagerDefSpec,
  type PkgManagerOpts,
  type ReporterContext,
  type ReporterDef,
  type RuleContext,
} from '../component';
import {ComponentKinds, RuleSeverities} from '../constants';
import {fromUnknownError} from '../error';
import {type PluginMetadata} from '../plugin';
import {readSmokerPkgJson, type FileManager} from '../util';
import {type MachineOutputError, type MachineOutputOk} from './machine-util';

export interface PluginLoaderInput {
  plugin: Readonly<PluginMetadata>;
  cwd: string;
  desiredPkgManagers: string[];
  fm: FileManager;
  systemExecutor: Executor;
  defaultExecutor: Executor;
  pkgManagerOpts?: PkgManagerOpts;
  smokerOpts: SmokerOptions;
  pluginRegistry: PluginRegistry;
}

export interface PluginLoaderContext extends PluginLoaderInput {
  pkgManagerDefSpecs?: PkgManagerDefSpec[];
  pkgManagers?: PkgManager[];
  error?: Error;
  pkgManagerDefSpecsWithCtx?: PkgManagerDefSpecsWithCtx[];

  enabledReporters: ReporterDef[];
  smokerPkgJson?: PackageJson;
  reporterDefsWithCtx?: ReporterDefWithCtx[];
  reporters?: SomeReporter[];
  ruleDefs: SomeRuleDef[];
  ruleDefsWithCtx?: RuleDefWithCtx[];
  rules?: SomeRule[];
}
export type PluginLoaderOutputOk = MachineOutputOk<{
  pkgManagers: PkgManager[];
  reporters: SomeReporter[];
  rules: SomeRule[];
}>;

export type PluginLoaderOutputError = MachineOutputError;

export type PluginLoaderOutput = PluginLoaderOutputOk | PluginLoaderOutputError;

export type CreatePkgManagerContextsInput = Pick<
  PluginLoaderContext,
  | 'pkgManagerDefSpecs'
  | 'fm'
  | 'systemExecutor'
  | 'defaultExecutor'
  | 'pkgManagerOpts'
>;

export interface LoadReportersInput {
  opts: SmokerOptions;
  pluginRegistry: PluginRegistry;
}

export type PkgManagerDefSpecsWithCtx = PkgManagerDefSpec & {
  ctx: PkgManagerContext;
};

export type LoadPkgManagersInput = Pick<
  PluginLoaderContext,
  'plugin' | 'cwd' | 'desiredPkgManagers'
>;

export interface CreateReporterContextsInput {
  reporterDefs: ReporterDef[];
  pkgJson: PackageJson;
  smokerOpts: SmokerOptions;
}

export interface ReporterDefWithCtx {
  def: ReporterDef;
  ctx: ReporterContext;
}

export interface RuleDefWithCtx {
  def: SomeRuleDef;
  ctx: RuleContext;
}

export const PluginLoaderMachine = setup({
  types: {
    input: {} as PluginLoaderInput,
    context: {} as PluginLoaderContext,
    output: {} as PluginLoaderOutput,
  },
  actions: {
    assignError: assign({
      error: (_, {error}: {error: unknown}) => fromUnknownError(error),
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
      enabledReporters: ({context: {smokerOpts, pluginRegistry, plugin}}) =>
        plugin.getEnabledReporters(
          smokerOpts,
          pluginRegistry.getComponentId.bind(pluginRegistry),
        ),
    }),

    assignEnabledRuleDefs: assign({
      ruleDefs: ({context: {plugin, pluginRegistry, smokerOpts}}) => {
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
      reporters: ({
        context: {reporterDefsWithCtx = [], pluginRegistry, plugin},
      }) =>
        reporterDefsWithCtx.map(({def, ctx}) => {
          const {id, componentName} = pluginRegistry.getComponent(def);
          pluginRegistry.registerComponent(
            plugin,
            ComponentKinds.Reporter,
            def,
            componentName,
          );
          return Reporter.create(id, def, plugin, ctx);
        }),
    }),
    createRules: assign({
      rules: ({context: {plugin, pluginRegistry, ruleDefs = []}}) =>
        ruleDefs.map((def) => {
          const {id, componentName} = pluginRegistry.getComponent(def);
          const rule = Rule.create(id, def, plugin);
          pluginRegistry.registerComponent(
            plugin,
            ComponentKinds.Rule,
            rule,
            rule.name ?? componentName,
          );
          return rule;
        }),
    }),
  },
  actors: {
    readSmokerPkgJson: fromPromise<PackageJson, void>(readSmokerPkgJson),
    loadPkgManagers: fromPromise<PkgManagerDefSpec[], LoadPkgManagersInput>(
      async ({input: {plugin, cwd, desiredPkgManagers}}) =>
        plugin.loadPkgManagers({
          cwd,
          desiredPkgManagers,
        }),
    ),
    createReporterContexts: fromPromise<
      ReporterDefWithCtx[],
      CreateReporterContextsInput
    >(async ({input: {smokerOpts, reporterDefs, pkgJson}}) => {
      return Promise.all(
        reporterDefs.map(async (def) => {
          const ctx: ReporterContext =
            await ReporterController.createReporterContext(
              def,
              smokerOpts,
              pkgJson,
            );
          return {def, ctx};
        }),
      );
    }),
    // createRuleContexts: fromPromise<
    //   RuleDefWithCtx[],
    //   {smokerOpts: SmokerOptions, ruleDefs: SomeRuleDef[]}
    // >(async ({input: {smokerOpts, ruleDefs}}) => {
    //   return Promise.all(
    //     ruleDefs.map(async (def) => {
    //       const ctx: RuleContext = await RuleController.createRuleContext(
    //     })
    //   )
    // }),
    createPkgManagerContexts: fromPromise<
      PkgManagerDefSpecsWithCtx[],
      CreatePkgManagerContextsInput
    >(
      async ({
        input: {
          pkgManagerDefSpecs,
          fm,
          systemExecutor,
          defaultExecutor,
          pkgManagerOpts: opts,
        },
      }) => {
        if (pkgManagerDefSpecs?.length) {
          return Promise.all(
            pkgManagerDefSpecs.map(async ({spec, def}) => {
              const tmpdir = await fm.createTempDir(
                `${spec.pkgManager}-${spec.version}`,
              );
              const executor = spec.isSystem ? systemExecutor : defaultExecutor;
              const ctx: PkgManagerContext = {
                spec,
                tmpdir,
                executor,
                ...opts,
              };
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
    succeeded: and(['hasPkgManagers', not('hasError'), 'hasReporters']),
    hasReporters: ({context: {reporters}}) => Boolean(reporters?.length),
  },
}).createMachine({
  /**
   * @xstate-layout N4IgpgJg5mDOIC5QAcDWUCyBDAdlmATgAoA2ArlAJY4AyA9lhGAQMQBUA2gAwC6iKdWJQAulOjn4gAHogCcAZgBsAOgCMAFgAc6xZq6qA7AFYDm1QBoQAT0Sql85Yq4LNmxatXbNAX2+W0mLj4zKQU1PSMzMokDBDUUCwQ4mDK1ABudKgpAdh4hKFUtLFRMYzxCOl0AMZYouLcPA2SyIIiYhJI0ogATLKaymbdRpY2CGbKRlxTdu6eWqpGvv7oucHE5IURTATRsfEszAR0O8gktQBmxwC2yjlB+RvhxTulcThQFTgZNXU4DU2dFpCX6SGQIVSKAzKdTdZzydRcRTqWQLWQGEa2KayZQGFHdboeIyKeFGbpLEB3PIhR5FSI7NJYEiUCC1eIAETA5wAysgwFVYCwAQJge1QT1NFD5EYFMYMQgDAtlCjcZpuko5mZyZS1gUnnTlAymSzRO8OdzefzBao+IDWiDOmDuhLlFKZcNrIgDO4lYY+mr3F5VFqVvdqWFadtlFdasxKIzKAAvfZJHApWDCGO3ENU9bhrZRaPCWPxpPvIUUu2ih2ISFy1RO7oDaXyVyzLzBwI53URgsxghxpmlqDKKoEMCs94AYXERakwgFKZSlSyWc7Opp+Z2heLg-iI7HE6g05ws-nn2+rPqvHLQLa4jFY2RSqM8nr7tGkK4EyU6gVsnURieAsHarA8ebPFGfYDome6juOJpHjOYBzgKhzHLcZzCJcBA3NqYGbBB279iWsEHghx6nrA57VJefzXrwzSVve1aPtisgvm+cpmP0voGPoHgakGfgUtm67gfqRHQUOBrxsa8REKJhACjeTEdKAYL1qYEymJ4ThSgsijdHKxKqDiXCvi2bbzCBoa5gRElQSR7wyUah4KWuSlWjawp3mpXTgt0WkmNxemAUSRkeggkJQnxFluB4ga+MJOB0Ew8CAopYb2dsjEisx6lyHKAC0RhKrI5WuN06jyASiiyN0ig2V2G4Qa88S5b5D4mHWXBQrCcVWWYizCXhWV6pGhrMoeZo8ny6U+faBUIPVcoGLCEzaEishcE6gFaE1YnZb2RbEbu7wdYt-kmCo+jhe+iCATF5mqHCqqmPoB34eNx07jBzlwYeFHIfOF1VkthnqMot2GfdYw7Wo4XEoNQnLB5Y09lujlncOk1ye87mgcw80VnlfkaVwL5Nm6xn1coDXyOZ6hM4BQ2fejm6QSdUl7mhY4QKD+X+RCNUuk6unmWFhlcQzSqaOxsh1QBQHyGzdnfZjXNOcOAMIQTtnE7el0acSjY1SFEsGRFH4U3Tz2WQl1kjZlasY8oi4C2TtjjJCniypF9Z6I4r3xRqqvdhzvOQB7D6-lChIKC9qgonV6L+4n0JVTCLa9ciEJJd4QA
   */
  context: ({input}): PluginLoaderContext => ({
    ...input,
    enabledReporters: [],
    ruleDefs: [],
  }),
  initial: 'loading',
  states: {
    loading: {
      entry: [
        {type: 'assignEnabledReporterDefs'},
        {type: 'assignEnabledRuleDefs'},
        log('getting enabled reporters'),
      ],
      invoke: {
        src: 'loadPkgManagers',
        input: ({
          context: {cwd, plugin, desiredPkgManagers},
        }): LoadPkgManagersInput => ({cwd, plugin, desiredPkgManagers}),
        onDone: {
          target: 'validatingDefSpecs',
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
            {type: 'assignError', params: ({event: {error}}) => ({error})},
          ],
          target: 'errored',
        },
      },
    },
    validatingDefSpecs: {
      always: [
        {
          target: 'materializing',
          guard: {type: 'hasPkgManagerDefSpecs'},
        },
        {
          target: 'errored',
          guard: 'notHasPkgManagerDefSpecs',
          actions: [{type: 'creatingMissingPkgManagersError'}],
        },
      ],
    },
    materializing: {
      type: 'parallel',
      entry: log('materializing'),
      states: {
        materializePkgManagers: {
          initial: 'creatingPkgManagerContexts',
          states: {
            creatingPkgManagerContexts: {
              invoke: {
                src: 'createPkgManagerContexts',
                input: ({
                  context: {
                    pkgManagerDefSpecs,
                    fm,
                    systemExecutor,
                    defaultExecutor,
                    pkgManagerOpts,
                  },
                }): CreatePkgManagerContextsInput => ({
                  pkgManagerDefSpecs,
                  fm,
                  systemExecutor,
                  defaultExecutor,
                  pkgManagerOpts,
                }),
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
                  target: '#pluginLoader.errored',
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
                  target: '#pluginLoader.errored',
                },
              ],
            },
            creatingPkgManagers: {
              type: 'final',
              entry: ['assignPkgManagers', log('created pkg managers')],
            },
          },
        },
        materializeReporters: {
          initial: 'readingSmokerPkgJson',
          states: {
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
                  target: '#pluginLoader.errored',
                },
              },
            },
            creatingReporterContexts: {
              invoke: {
                src: 'createReporterContexts',
                input: ({
                  context: {smokerOpts, enabledReporters, smokerPkgJson},
                }): CreateReporterContextsInput => ({
                  reporterDefs: enabledReporters,
                  smokerOpts,
                  pkgJson: smokerPkgJson!,
                }),
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
                  target: '#pluginLoader.errored',
                },
              },
            },
            creatingReporters: {
              guard: {type: 'hasReporters'},
              entry: [log('creating reporters'), {type: 'assignReporters'}],
              type: 'final',
            },
          },
        },
        materializeRules: {
          initial: 'createRules',
          states: {
            createRules: {
              entry: [{type: 'createRules'}],
              type: 'final',
            },
          },
        },
      },
      onDone: [
        {
          target: 'done',
          guard: {type: 'succeeded'},
        },
        {
          target: 'errored',
          guard: {type: 'hasError'},
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
  id: 'pluginLoader',
});
