import {ERROR, FINAL, OK, PARALLEL, RuleSeverities} from '#constants';
import {fromUnknownError} from '#error/from-unknown-error';
import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PluginRegistry} from '#plugin/plugin-registry';
import {type PackageJson} from 'type-fest';
import {assign, log, not, setup} from 'xstate';
import {
  loadPkgManagers,
  loadReporters,
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
  plugin: Readonly<PluginMetadata>;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  component?: LoadableComponent;
}

export type LoaderMachineContext = LoaderMachineInput & {
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  reporterInitPayloads: ReporterInitPayload[];
  ruleInitPayloads: RuleInitPayload[];
  error?: Error;
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
    assignError: assign({
      error: (_, {error}: {error: unknown}) => fromUnknownError(error),
    }),

    assignRuleInitPayloads: assign({
      ruleInitPayloads: ({context}) => {
        const {plugin, smokerOptions, pluginRegistry} = context;
        const {ruleDefs} = plugin;

        const enabledRuleDefs = ruleDefs.filter((def) => {
          const id = pluginRegistry.getComponentId(def);
          return smokerOptions.rules[id]?.severity !== RuleSeverities.Off;
        });

        return enabledRuleDefs.map((def) => ({def, plugin}));
      },
    }),

    assignReporterInitPayloads: assign({
      reporterInitPayloads: ({context}, payloads: ReporterInitPayload[]) => {
        return payloads;
        // const {plugin, smokerOptions, pluginRegistry} = context;
        // const {reporterDefs} = plugin;
        // const desiredReporters = new Set(smokerOptions.reporter);
        // const enabledReporterDefs = reporterDefs.filter((def) => {
        //   const id = pluginRegistry.getComponentId(def);
        //   if (desiredReporters.has(id)) {
        //     return true;
        //   }
        //   if (isFunction(def.when)) {
        //     try {
        //       const result = def.when(smokerOptions);
        //       return result;
        //     } catch {}
        //   }
        //   return false;
        // });

        // return enabledReporterDefs.map((def) => ({def, plugin}));
      },
    }),

    assignPkgManagerInitPayloads: assign({
      pkgManagerInitPayloads: (_, payloads: PkgManagerInitPayload[]) =>
        payloads,
    }),
  },
  actors: {
    loadPkgManagers,
    loadReporters,
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
    'Loads components. Pulls package managers, reporters and rules out of plugins and readies them for use; any combination of components may be requested',
  entry: [
    log(
      ({context: {component}}) => `Loader loading component(s): ${component}`,
    ),
  ],
  context: ({
    input: {component = LoadableComponents.All, ...input},
  }): LoaderMachineContext => {
    return {
      pkgManagerInitPayloads: [],
      reporterInitPayloads: [],
      ruleInitPayloads: [],
      component,
      ...input,
    };
  },
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
                input: ({context}): LoadPkgManagersInput => {
                  const {plugin, smokerOptions: smokerOpts} = context;
                  return {
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
              invoke: {
                src: 'loadReporters',
                input: ({
                  context: {plugin, pluginRegistry, smokerOptions},
                }) => ({plugin, pluginRegistry, smokerOptions}),
                onDone: {
                  actions: [
                    {
                      type: 'assignReporterInitPayloads',
                      params: ({event: {output}}) => output,
                    },
                  ],
                  target: 'done',
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
              entry: log('skipped reporter loading'),
              type: FINAL,
            },
            done: {
              entry: log('done loading reporters'),
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
