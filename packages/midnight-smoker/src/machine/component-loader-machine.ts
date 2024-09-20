import {ERROR, FINAL, OK, PARALLEL} from '#constants';
import {MachineError} from '#error/machine-error';
import {type ReporterError} from '#error/reporter-error';
import {type AbortEvent} from '#machine/event/abort';
import {
  type ActorOutputError,
  type ActorOutputOk,
  DEFAULT_INIT_ACTION,
  INIT_ACTION,
} from '#machine/util';
import {
  type PkgManagerEnvelope,
  type ReporterEnvelope,
  type RuleEnvelope,
} from '#plugin/component-envelope';
import {type PluginRegistry} from '#plugin/registry';
import {type SmokerOptions} from '#schema/smoker-options';
import {type WorkspaceInfo} from '#schema/workspace-info';
import * as assert from '#util/assert';
import {fromUnknownError} from '#util/error-util';
import {type FileManager} from '#util/filemanager';
import {type PackageJson} from 'type-fest';
import {assign, enqueueActions, log, not, raise, setup} from 'xstate';

import {
  PkgManagerLoaderMachine,
  type PkgManagerLoaderMachineInput,
} from './pkg-manager-loader-machine';

export type LoadableComponent =
  (typeof LoadableComponents)[keyof typeof LoadableComponents];

export type ComponentLoaderMachineContext = {
  aborted?: boolean;
  error?: MachineError;
  pkgManagerEnvelopes: PkgManagerEnvelope[];
  reporterEnvelopes: ReporterEnvelope[];
  ruleEnvelopes: RuleEnvelope[];
  smokerPkgJson?: PackageJson;
} & ComponentLoaderMachineInput;

export type ComponentLoaderMachineEvent = AbortEvent;

export type ComponentLoaderMachineOutput =
  | ComponentLoaderMachineOutputError
  | ComponentLoaderMachineOutputOk;

export type ComponentLoaderMachineOutputError = ActorOutputError<
  MachineError,
  {aborted?: boolean}
>;

export type ComponentLoaderMachineOutputOk = ActorOutputOk<{
  pkgManagerEnvelopes: PkgManagerEnvelope[];
  reporterEnvelopes: ReporterEnvelope[];
  ruleEnvelopes: RuleEnvelope[];
}>;

export interface ComponentLoaderMachineInput {
  component?: LoadableComponent;
  fileManager: FileManager;
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

/**
 * @internal
 */
export const ComponentLoaderMachine = setup({
  actions: {
    abort: raise({type: 'ABORT'}),
    aborted: assign({aborted: true}),

    assignError: assign({
      error: ({context, self}, {error}: {error: unknown}) => {
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
     * Assigns result of {@link loadPkgManagersLogic} to
     * {@link ComponentLoaderMachineContext.pkgManagerEnvelopes context.pkgManagerEnvelopes}
     */
    assignPkgManagerEnvelopes: assign({
      pkgManagerEnvelopes: (_, envelopes: PkgManagerEnvelope[]) => envelopes,
    }),

    destroyAllChildren: enqueueActions(({enqueue, self}) => {
      const snapshot = self.getSnapshot();
      for (const child of Object.keys(snapshot.children)) {
        enqueue.stopChild(child);
      }
    }),
    [INIT_ACTION]: DEFAULT_INIT_ACTION(),

    /**
     * Determines which reporters are enabled based on options and reporter
     * definitions. Assigns result to
     * {@link ComponentLoaderMachineContext.reporterEnvelopes context.reporterEnvelopes}
     */
    loadReporters: enqueueActions(
      ({context: {pluginRegistry, smokerOptions}, enqueue}) => {
        try {
          enqueue.assign({
            reporterEnvelopes: pluginRegistry.enabledReporters(smokerOptions),
          });
        } catch (err) {
          enqueue({
            // @ts-expect-error xstate/TS bug
            params: {error: err as ReporterError},
            type: 'assignError',
          });
        }
      },
    ),

    /**
     * Determines which rules are enabled based on options and rule definitions.
     * Assigns result to
     * {@link ComponentLoaderMachineContext.ruleEnvelopes context.ruleEnvelopes}
     */
    loadRules: assign({
      ruleEnvelopes: ({context: {pluginRegistry, smokerOptions}}) =>
        pluginRegistry.enabledRules(smokerOptions),
    }),
  },
  actors: {
    PkgManagerLoaderMachine,
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
  types: {
    context: {} as ComponentLoaderMachineContext,
    events: {} as ComponentLoaderMachineEvent,
    input: {} as ComponentLoaderMachineInput,
    output: {} as ComponentLoaderMachineOutput,
  },
}).createMachine({
  context: ({
    input: {component = LoadableComponents.All, ...input},
  }): ComponentLoaderMachineContext => ({
    component,
    pkgManagerEnvelopes: [],
    reporterEnvelopes: [],
    ruleEnvelopes: [],
    ...input,
  }),
  description:
    'Pulls enabled package managers, reporters and rules out of plugins and readies them for use; any combination of components may be requested',
  entry: [
    INIT_ACTION,
    log(
      ({context: {component}}) => `Loader loading component(s): ${component}`,
    ),
  ],
  id: 'ComponentLoaderMachine',
  initial: 'selecting',
  on: {
    ABORT: {
      actions: [log('aborting!'), 'destroyAllChildren', 'aborted'],
      target: '.errored',
    },
  },
  output: ({
    context: {
      aborted,
      error,
      pkgManagerEnvelopes,
      reporterEnvelopes,
      ruleEnvelopes,
    },
    self: {id: actorId},
  }) =>
    error
      ? {aborted, actorId, error, type: ERROR}
      : {
          actorId,
          pkgManagerEnvelopes,
          reporterEnvelopes,
          ruleEnvelopes,
          type: OK,
        },
  states: {
    done: {
      entry: log(
        ({context: {pkgManagerEnvelopes, reporterEnvelopes, ruleEnvelopes}}) =>
          `Loaded ${pkgManagerEnvelopes.length} package manager(s), ${ruleEnvelopes.length} rule(s), and ${reporterEnvelopes.length} reporters`,
      ),
      type: FINAL,
    },

    errored: {
      entry: log(
        ({context: {error}}) => `Error when loading components: ${error}`,
      ),
      type: FINAL,
    },

    selecting: {
      onDone: {
        target: 'done',
      },
      states: {
        selectPkgManagers: {
          description:
            'Determines which package managers, as defined by plugins, to load, based on user options and environment',
          initial: 'gate',
          states: {
            done: {
              entry: log('Loading package managers complete'),
              type: FINAL,
            },
            errored: {
              entry: 'abort',
              type: FINAL,
            },
            gate: {
              always: [
                {
                  actions: [log('Loading package managers')],
                  guard: 'shouldProcessPkgManagers',
                  target: 'loadingPkgManagers',
                },
                {
                  guard: not('shouldProcessPkgManagers'),
                  target: 'skipped',
                },
              ],
            },
            loadingPkgManagers: {
              description:
                'Invokes the PkgManagerLoaderMachine actor; selecting package managers is more in-depth than reporters or rules, which are only based on user options',
              entry: [log('Invoking PkgManagerLoaderMachine...')],
              invoke: {
                input: ({
                  context: {
                    fileManager,
                    pluginRegistry,
                    smokerOptions,
                    workspaceInfo,
                  },
                }): PkgManagerLoaderMachineInput => ({
                  componentRegistry: pluginRegistry.componentRegistry,
                  desiredPkgManagers: smokerOptions.pkgManager,
                  fileManager,
                  plugins: pluginRegistry.plugins,
                  workspaceInfo,
                }),
                onDone: [
                  {
                    actions: [
                      {
                        params: ({event: {output}}) => {
                          assert.ok(output.type === OK);
                          return output.envelopes;
                        },
                        type: 'assignPkgManagerEnvelopes',
                      },
                    ],
                    guard: ({event: {output}}) => output.type === OK,
                    target: 'done',
                  },
                ],
                onError: {
                  actions: [
                    {
                      params: ({event: {error}}) => ({error}),
                      type: 'assignError',
                    },
                  ],
                  target: 'errored',
                },
                src: 'PkgManagerLoaderMachine',
              },
            },
            skipped: {
              entry: log('Skipped loading package managers'),
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
                  actions: [log('Loading reporters...')],
                  guard: 'shouldProcessReporters',
                  target: 'loadingReporters',
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
                  actions: [log('Loading rules...')],
                  guard: 'shouldProcessRules',
                  target: 'loadingRules',
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
      type: PARALLEL,
    },
  },
});
