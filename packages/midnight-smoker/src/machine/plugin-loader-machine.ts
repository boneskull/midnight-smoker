import {ERROR, FINAL, OK, PARALLEL} from '#constants';
import {MachineError} from '#error/machine-error';
import {type ActorOutputError, type ActorOutputOk} from '#machine/util';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PluginRegistry} from '#plugin/plugin-registry';
import {type SmokerOptions} from '#schema/smoker-options';
import type {WorkspaceInfo} from '#schema/workspace-info';
import {fromUnknownError} from '#util/error-util';
import {isFunction} from 'lodash';
import {type PackageJson} from 'type-fest';
import {assign, enqueueActions, log, not, raise, setup} from 'xstate';
import {
  loadPkgManagers,
  type LoadPkgManagersInput,
} from './actor/load-pkg-managers';
import {type AbortEvent} from './event/abort';
import {
  type PkgManagerInitPayload,
  type ReporterInitPayload,
  type RuleInitPayload,
} from './payload';

export type LoadableComponent =
  (typeof LoadableComponents)[keyof typeof LoadableComponents];

export type PluginLoaderMachineContext = PluginLoaderMachineInput & {
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  reporterInitPayloads: ReporterInitPayload[];
  ruleInitPayloads: RuleInitPayload[];
  error?: MachineError;
  smokerPkgJson?: PackageJson;
  aborted?: boolean;
};

export type PluginLoaderMachineEvent = AbortEvent;

export type PluginLoaderMachineOutput =
  | PluginLoaderMachineOutputOk
  | PluginLoaderMachineOutputError;

export type PluginLoaderMachineOutputError = ActorOutputError<
  MachineError,
  {aborted?: boolean}
>;

export type PluginLoaderMachineOutputOk = ActorOutputOk<{
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  reporterInitPayloads: ReporterInitPayload[];
  ruleInitPayloads: RuleInitPayload[];
}>;

export interface PluginLoaderMachineInput {
  component?: LoadableComponent;
  plugin: Readonly<PluginMetadata>;
  pluginRegistry: PluginRegistry;
  smokerOptions: SmokerOptions;
  workspaceInfo: WorkspaceInfo[];
}

export const LoadableComponents = {
  All: 'all',
  PkgManagers: 'pkgManagers',
  Reporters: 'reporters',
  Rules: 'rules',
} as const;

export const PluginLoaderMachine = setup({
  types: {
    input: {} as PluginLoaderMachineInput,
    context: {} as PluginLoaderMachineContext,
    output: {} as PluginLoaderMachineOutput,
    events: {} as PluginLoaderMachineEvent,
  },
  actions: {
    /**
     * Determines which reporters are enabled based on options and reporter
     * definitions. Assigns result to
     * {@link PluginLoaderMachineContext.reporterInitPayloads context.reporterInitPayloads}
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
     * {@link PluginLoaderMachineContext.ruleInitPayloads context.ruleInitPayloads}
     */
    loadRules: assign({
      ruleInitPayloads: ({
        context: {
          plugin,
          smokerOptions: {rules},
          pluginRegistry,
        },
      }) =>
        pluginRegistry
          .enabledRuleDefs(rules, plugin)
          .map(([id, def]) => ({id, def, plugin})),
    }),

    /**
     * Assigns result of {@link loadPkgManagers} to
     * {@link PluginLoaderMachineContext.pkgManagerInitPayloads context.pkgManagerInitPayloads}
     */
    assignPkgManagerInitPayloads: assign({
      pkgManagerInitPayloads: (_, payloads: PkgManagerInitPayload[]) =>
        payloads,
    }),
    abort: raise({type: 'ABORT'}),
    aborted: assign({aborted: true}),
    stopAllChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      for (const child of Object.keys(snapshot.children)) {
        enqueue.stopChild(child);
      }
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
  }): PluginLoaderMachineContext => ({
    pkgManagerInitPayloads: [],
    reporterInitPayloads: [],
    ruleInitPayloads: [],
    component,
    ...input,
  }),
  initial: 'selecting',
  on: {
    ABORT: {
      actions: [log('aborting!'), 'stopAllChildren', 'aborted'],
      target: '.errored',
    },
  },
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
                  actions: [log('Loading package managers')],
                },
                {
                  guard: not('shouldProcessPkgManagers'),
                  target: 'skipped',
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
                  target: 'done',
                },
                onError: {
                  actions: [
                    {
                      type: 'assignError',
                      params: ({event: {error}}) => ({error}),
                    },
                  ],
                  target: 'errored',
                },
              },
            },
            errored: {
              type: FINAL,
              entry: 'abort',
            },
            skipped: {
              entry: log('Skipped loading package managers'),
              type: FINAL,
            },
            done: {
              entry: log('Loading package managers complete'),
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
                  actions: [log('Loading reporters...')],
                },
                {
                  guard: not('shouldProcessReporters'),
                  target: 'skipped',
                },
              ],
            },
            loadingReporters: {
              entry: [
                {type: 'loadReporters'},
                log('Loading reporters complete'),
              ],
              type: FINAL,
            },
            skipped: {
              entry: log('Skipped loading reporter'),
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
                  actions: [log('Loading rules...')],
                },
                {
                  guard: not('shouldProcessRules'),
                  target: 'skipped',
                },
              ],
            },
            loadingRules: {
              entry: [{type: 'loadRules'}, log('Loading rules complete')],
              type: FINAL,
            },
            skipped: {
              entry: log('Skipped loading rules'),
              type: FINAL,
            },
          },
        },
      },
      onDone: {
        target: 'done',
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
          `Loaded ${pkgManagerInitPayloads.length} package manager(s), ${ruleInitPayloads.length} rule(s), and ${reporterInitPayloads.length} reporters`,
      ),
      type: FINAL,
    },

    errored: {
      entry: log(
        ({context: {error}}) => `Error when loading components: ${error}`,
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
      aborted,
    },
  }) =>
    error
      ? {error, type: ERROR, id, aborted}
      : {
          pkgManagerInitPayloads,
          reporterInitPayloads,
          ruleInitPayloads,
          type: OK,
          id,
        },
  id: 'PluginLoaderMachine',
});
