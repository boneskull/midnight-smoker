import {ERROR, FINAL, OK, PARALLEL, RuleSeverities} from '#constants';
import {fromUnknownError} from '#error/from-unknown-error';
import {MachineError} from '#error/machine-error';
import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PluginRegistry} from '#plugin/plugin-registry';
import type {WorkspaceInfo} from '#schema/workspaces';
import {isFunction} from 'lodash';
import {type PackageJson} from 'type-fest';
import {assign, enqueueActions, log, not, setup} from 'xstate';
import {
  loadPkgManagers,
  type LoadPkgManagersInput,
} from './loader-machine-actors';
import {
  type PkgManagerInitPayload,
  type ReporterInitPayload,
  type RuleInitPayload,
} from './loader-machine-types';

export const LoadableComponents = {
  All: 'all',
  PkgManagers: 'pkgManagers',
  Reporters: 'reporters',
  Rules: 'rules',
} as const;

export type LoadableComponent =
  (typeof LoadableComponents)[keyof typeof LoadableComponents];

export interface LoaderMachineInput {
  signal: AbortSignal;
  plugin: Readonly<PluginMetadata>;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  component?: LoadableComponent;
  workspaceInfo: WorkspaceInfo[];
}

export type LoaderMachineContext = LoaderMachineInput & {
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  reporterInitPayloads: ReporterInitPayload[];
  ruleInitPayloads: RuleInitPayload[];
  error?: MachineError;
  smokerPkgJson?: PackageJson;
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
    /**
     * Determines which reporters are enabled based on options and reporter
     * definitions. Assigns result to
     * {@link LoaderMachineContext.reporterInitPayloads context.reporterInitPayloads}
     */
    loadReporters: enqueueActions(
      ({enqueue, context: {plugin, smokerOptions, pluginRegistry}}) => {
        const {reporterDefs} = plugin;
        const desiredReporters = new Set(smokerOptions.reporter);
        const enabledReporterDefs = reporterDefs.filter((def) => {
          const id = pluginRegistry.getComponentId(def);
          if (desiredReporters.has(id)) {
            return true;
          }
          if (isFunction(def.when)) {
            try {
              return def.when(smokerOptions);
            } catch (error) {
              // TODO: maybe we should create a custom error for this
              // @ts-expect-error xstate/TS bug
              enqueue({type: 'assignError', params: {error}});
            }
          }
          return false;
        });
        const reporterInitPayloads = enabledReporterDefs.map((def) => ({
          def,
          plugin,
          id: pluginRegistry.getComponentId(def),
        }));
        enqueue.assign({reporterInitPayloads});
      },
    ),

    assignError: assign({
      error: ({self, context}, {error}: {error: unknown}) => {
        const err = fromUnknownError(error);
        if (context.error) {
          return context.error.cloneWith(err);
        }

        return new MachineError(
          `Package manager encountered an error`,
          err,
          self.id,
        );
      },
    }),

    /**
     * Determines which rules are enabled based on options and rule definitions.
     * Assigns result to
     * {@link LoaderMachineContext.ruleInitPayloads context.ruleInitPayloads}
     */
    loadRules: assign({
      ruleInitPayloads: ({
        context: {
          plugin,
          smokerOptions: {rules: rulesConfig},
          pluginRegistry,
        },
      }) =>
        plugin.ruleDefs.reduce<RuleInitPayload[]>((acc, def) => {
          const id = pluginRegistry.getComponentId(def);
          if (rulesConfig[id]?.severity !== RuleSeverities.Off) {
            acc = [...acc, {def, plugin, id}];
          }
          return acc;
        }, []),
    }),

    /**
     * Assigns result of {@link loadPkgManagers} to
     * {@link LoaderMachineContext.pkgManagerInitPayloads context.pkgManagerInitPayloads}
     */
    assignPkgManagerInitPayloads: assign({
      pkgManagerInitPayloads: (_, payloads: PkgManagerInitPayload[]) =>
        payloads,
    }),
  },
  actors: {
    loadPkgManagers,
  },
  guards: {
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
    'Pulls enabled package managers, reporters and rules out of plugins and readies them for use; any combination of components may be requested',
  entry: [
    log(
      ({context: {component}}) => `Loader loading component(s): ${component}`,
    ),
  ],
  context: ({
    input: {component = LoadableComponents.All, ...input},
  }): LoaderMachineContext => ({
    pkgManagerInitPayloads: [],
    reporterInitPayloads: [],
    ruleInitPayloads: [],
    component,
    ...input,
  }),
  initial: 'selecting',
  states: {
    selecting: {
      type: PARALLEL,
      states: {
        selectPkgManagers: {
          description:
            'Determines which package managers, as defined by plugins, to load, based on user options and environment',
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
              description:
                'Invokes the loadPkgManagers actor; selecting package managers is more in-depth than reporters or rules, which are only based on user options',
              invoke: {
                src: 'loadPkgManagers',
                input: ({
                  context: {
                    plugin,
                    smokerOptions,
                    pluginRegistry,
                    workspaceInfo,
                  },
                }): LoadPkgManagersInput => ({
                  workspaceInfo,
                  plugin,
                  pluginRegistry,
                  smokerOptions,
                }),
                onDone: {
                  actions: [
                    {
                      type: 'assignPkgManagerInitPayloads',
                      params: ({event: {output}}) => output,
                    },
                  ],
                  target: '#LoaderMachine.selecting.selectPkgManagers.done',
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

        selectReporters: {
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
              entry: [{type: 'loadReporters'}, log('done loading reporters')],
              type: FINAL,
            },
            skipped: {
              entry: log('skipped reporter loading'),
              type: FINAL,
            },
          },
        },
        selectRules: {
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
              entry: [{type: 'loadRules'}, log('done loading rules')],
              type: FINAL,
            },
            skipped: {
              entry: log('skipped rule creation'),
              type: FINAL,
            },
          },
        },
      },
      onDone: {
        target: 'done',
        actions: [log('selecting complete')],
      },
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
      entry: log(
        ({context: {error}}) => `error when loading components: ${error}`,
      ),
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
