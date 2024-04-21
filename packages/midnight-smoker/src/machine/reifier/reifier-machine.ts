import {
  ComponentKinds,
  DEFAULT_EXECUTOR_ID,
  PACKAGE_JSON,
  RuleSeverities,
  SYSTEM_EXECUTOR_ID,
} from '#constants';
import {fromUnknownError} from '#error';
import {type SmokerOptions} from '#options';
import {PkgManager} from '#pkg-manager';
import {type PluginMetadata, type PluginRegistry} from '#plugin';
import {Reporter, type SomeReporter} from '#reporter';
import {Rule, type RuleContext} from '#rule';
import {
  PkgManagerContextSchema,
  WorkspacesConfigSchema,
  type Executor,
  type PkgManagerContext,
  type PkgManagerDefSpec,
  type PkgManagerOpts,
  type ReporterContext,
  type ReporterDef,
  type SomeRule,
  type SomeRuleDef,
} from '#schema';
import {readSmokerPkgJson, type FileManager} from '#util';
import {glob} from 'glob';
import {isFunction} from 'lodash';
import {Console} from 'node:console';
import path from 'node:path';
import {
  type PackageJson,
  type SetFieldType,
  type SetOptional,
  type SetRequired,
  type Simplify,
} from 'type-fest';
import {and, assign, fromPromise, log, not, setup} from 'xstate';
import {type MachineOutputError, type MachineOutputOk} from '../machine-util';

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
  smokerOpts: SmokerOptions;
  pkgManager?: ReifierPkgManagerParams;
  component?: LoadableComponent;
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
  workspaces: Record<string, string>;
};

export type ReifierOutputOk = MachineOutputOk<{
  pkgManagers: PkgManager[];
  reporters: SomeReporter[];
  rules: SomeRule[];
}>;

export type ReifierOutputError = MachineOutputError;

export type ReifierOutput = ReifierOutputOk | ReifierOutputError;

export type CreatePkgManagerContextsInput = SetRequired<
  Pick<
    ReifierPkgManagerParams,
    'fm' | 'systemExecutor' | 'defaultExecutor' | 'pkgManagerOpts'
  > &
    Pick<ReifierContext, 'pkgManagerDefSpecs' | 'workspaces'>,
  'systemExecutor' | 'defaultExecutor'
>;

export interface LoadReportersInput {
  opts: SmokerOptions;
  pluginRegistry: PluginRegistry;
}

export type PkgManagerDefSpecsWithCtx = PkgManagerDefSpec & {
  ctx: PkgManagerContext;
};

export type LoadPkgManagersInput = Pick<ReifierPkgManagerParams, 'cwd'> &
  Pick<ReifierContext, 'plugin' | 'smokerOpts'>;

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

export type ReporterStreams = {
  stderr: NodeJS.WritableStream;
  stdout: NodeJS.WritableStream;
};

async function getStreams<Ctx = unknown>(
  def: ReporterDef<Ctx>,
): Promise<ReporterStreams> {
  let stdout: NodeJS.WritableStream = process.stdout;
  let stderr: NodeJS.WritableStream = process.stderr;
  if (def.stdout) {
    stdout = isFunction(def.stdout) ? await def.stdout() : def.stdout;
  }
  if (def.stderr) {
    stderr = isFunction(def.stderr) ? await def.stderr() : def.stderr;
  }
  return {stdout, stderr};
}

export const ReifierMachine = setup({
  types: {
    input: {} as ReifierInput,
    context: {} as ReifierContext,
    output: {} as ReifierOutput,
  },
  actions: {
    assignWorkspaces: assign({
      workspaces: (_, workspaces: Record<string, string>) => workspaces,
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
        const {plugin, pluginRegistry, smokerOpts} = context;
        return plugin.getEnabledReporterDefs(
          smokerOpts,
          pluginRegistry.getComponentId.bind(pluginRegistry),
        );
      },
    }),

    assignEnabledRuleDefs: assign({
      enabledRuleDefs: ({context}) => {
        const {plugin, smokerOpts, pluginRegistry} = context;
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
    // TODO this is gonna need a test or two
    queryWorkspaces: fromPromise<
      Record<string, string>,
      {cwd: string; fm: FileManager; includeRoot?: boolean}
    >(
      async ({
        input: {cwd, fm, includeRoot = false},
      }): Promise<Record<string, string>> => {
        const {packageJson: rootPkgJson} = await fm.findPkgUp(cwd, {
          strict: true,
          normalize: true,
        });

        const getWorkspaceInfo = async (
          paths: string[],
        ): Promise<Record<string, string>> => {
          const workspaces = await glob(paths, {
            cwd,
            withFileTypes: true,
          });
          const entries = await Promise.all(
            workspaces
              .filter((workspace) => workspace.isDirectory())
              .map(async (workspace) => {
                const fullpath = workspace.fullpath();
                const workspacePkgJson = await fm.readPkgJson(
                  path.join(fullpath, PACKAGE_JSON),
                );
                return [workspacePkgJson.name ?? '(unknown)', fullpath] as [
                  pkgName: string,
                  path: string,
                ];
              }),
          );
          return Object.fromEntries(entries);
        };

        const result = WorkspacesConfigSchema.safeParse(rootPkgJson.workspaces);
        let workspaces: string[] = [];
        if (result.success) {
          workspaces = result.data;
          if (includeRoot) {
            workspaces = [cwd, ...workspaces];
          }
        } else {
          workspaces = [cwd];
        }
        return getWorkspaceInfo(workspaces);
      },
    ),
    readSmokerPkgJson: fromPromise<PackageJson, void>(readSmokerPkgJson),
    loadPkgManagers: fromPromise<PkgManagerDefSpec[], LoadPkgManagersInput>(
      async ({input: {plugin, cwd, smokerOpts}}) => {
        return plugin.loadPkgManagers({
          cwd,
          desiredPkgManagers: smokerOpts.pkgManager,
        });
      },
    ),
    createReporterContexts: fromPromise<
      ReporterDefWithCtx[],
      CreateReporterContextsInput
    >(async ({input: {smokerOpts, reporterDefs, pkgJson}}) => {
      return Promise.all(
        reporterDefs.map(async (def) => {
          const {stdout, stderr} = await getStreams(def);
          const console = new Console({stdout, stderr});

          const ctx: ReporterContext = {
            opts: smokerOpts,
            pkgJson,
            console,
            stdout,
            stderr,
          };
          return {def, ctx};
        }),
      );
    }),
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
          workspaces,
        },
      }) => {
        if (pkgManagerDefSpecs?.length) {
          return Promise.all(
            pkgManagerDefSpecs.map(async ({spec, def}) => {
              const tmpdir = await fm.createTempDir(
                `${spec.pkgManager}-${spec.version}`,
              );
              const executor = spec.isSystem ? systemExecutor : defaultExecutor;
              const ctx = PkgManagerContextSchema.parse({
                spec,
                tmpdir,
                executor,
                workspaceInfo: workspaces,
                ...opts,
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
      smokerOpts,
      ...input
    },
  }): ReifierContext => {
    const enabledReporterDefs = plugin.getEnabledReporterDefs(
      smokerOpts,
      pluginRegistry.getComponentId.bind(pluginRegistry),
    );
    // TODO make plugin.getEnabledRuleDefs
    const enabledRuleDefs = [...plugin.ruleDefMap.values()].filter((def) => {
      const id = pluginRegistry.getComponentId(def);
      return smokerOpts.rules[id].severity !== RuleSeverities.Off;
    });
    return {
      component,
      plugin,
      pluginRegistry,
      smokerOpts,
      ...input,
      enabledReporterDefs,
      enabledRuleDefs,
      workspaces: {},
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
                  const {plugin, smokerOpts} = context;
                  const {cwd} = context.pkgManager!;
                  return {
                    cwd,
                    plugin,
                    smokerOpts,
                  };
                },
                onDone: {
                  target: 'queryWorkspaces',
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
            queryWorkspaces: {
              invoke: {
                src: 'queryWorkspaces',
                input: ({context}) => ({
                  cwd: context.smokerOpts.cwd,
                  fm: context.pkgManager!.fm,
                  includeRoot: context.smokerOpts.includeRoot,
                }),
                onDone: {
                  actions: [
                    {
                      type: 'assignWorkspaces',
                      params: ({event: {output: workspaces}}) => workspaces,
                    },
                  ],
                  target: 'creatingPkgManagerContexts',
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
            creatingPkgManagerContexts: {
              invoke: {
                src: 'createPkgManagerContexts',
                input: ({context}): CreatePkgManagerContextsInput => {
                  const {pkgManagerDefSpecs, pluginRegistry, workspaces} =
                    context;
                  const {
                    fm,
                    systemExecutor = pluginRegistry.getExecutor(
                      SYSTEM_EXECUTOR_ID,
                    ),
                    defaultExecutor = pluginRegistry.getExecutor(
                      DEFAULT_EXECUTOR_ID,
                    ),
                    pkgManagerOpts,
                  } = context.pkgManager!;
                  return {
                    pkgManagerDefSpecs,
                    fm,
                    systemExecutor,
                    defaultExecutor,
                    pkgManagerOpts,
                    workspaces,
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
                  context: {smokerOpts, enabledReporterDefs, smokerPkgJson},
                }): CreateReporterContextsInput => ({
                  reporterDefs: enabledReporterDefs,
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
