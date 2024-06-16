import {type MachineError} from '#error/machine-error';
import {type SmokeOkEventData} from '#event/smoker-events';
import {type Executor} from '#executor';
import {type LoaderMachine} from '#machine/loader';
import {
  type PkgManagerMachine,
  type PkgManagerMachineOutput,
} from '#machine/pkg-manager';
import {type ReporterMachine} from '#machine/reporter';
import type * as MachineUtil from '#machine/util';
import {type SmokerOptions} from '#options/options';
import {type PluginRegistry} from '#plugin/plugin-registry';
import {type LintResult} from '#schema/lint-result';
import {type RunScriptResult} from '#schema/run-script-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type FileManager} from '#util/filemanager';
import {type PackageJson} from 'type-fest';
import {type ActorRefFrom} from 'xstate';
import {
  type PkgManagerInitPayload,
  type ReporterInitPayload,
  type RuleInitPayload,
} from '../loader/loader-machine-types';
import {type InstallBusMachine} from './install-bus-machine';
import {type LintBusMachine} from './lint-bus-machine';
import {type PackBusMachine} from './pack-bus-machine';
import {type ScriptBusMachine} from './script-bus-machine';

export type CtrlMachineOutput = CtrlOutputOk | CtrlOutputError;

export type CtrlOutputError = MachineUtil.ActorOutputError<
  Error,
  BaseCtrlMachineOutput
>;

export type CtrlOutputOk = MachineUtil.ActorOutputOk<BaseCtrlMachineOutput>;

export interface BaseCtrlMachineOutput extends SmokeOkEventData {
  id: string;

  /**
   * If no scripts nor linting occurred, this will be `true`.
   */
  noop?: boolean;

  /**
   * If the machine has aborted, this will be `true`.
   */
  aborted?: boolean;
}

export interface CtrlMachineContext extends CtrlMachineInput {
  /**
   * Whether or not the machine has aborted
   */
  aborted?: boolean;

  /**
   * Default executor provided to `PkgManagerMachine`s which are not using a
   * system package manager.
   */
  defaultExecutor: Executor;

  error?: MachineError;
  fileManager: FileManager;
  installBusMachineRef?: ActorRefFrom<typeof InstallBusMachine>;
  lingered?: string[];
  lintBusMachineRef?: ActorRefFrom<typeof LintBusMachine>;
  lintResults?: LintResult[];
  loaderMachineRefs: Record<string, ActorRefFrom<typeof LoaderMachine>>;
  packBusMachineRef?: ActorRefFrom<typeof PackBusMachine>;
  pkgManagerInitPayloads: PkgManagerInitPayload[];
  pkgManagerMachineRefs?: Record<
    string,
    ActorRefFrom<typeof PkgManagerMachine>
  >;

  pkgManagerMachinesOutput: PkgManagerMachineOutput[];

  pkgManagers?: StaticPkgManagerSpec[];
  reporterInitPayloads: ReporterInitPayload[];
  reporterMachineRefs: Record<string, ActorRefFrom<typeof ReporterMachine>>;
  ruleInitPayloads: RuleInitPayload[];
  runScriptResults?: RunScriptResult[];
  scriptBusMachineRef?: ActorRefFrom<typeof ScriptBusMachine>;

  /**
   * {@inheritDoc CtrlMachineInput.shouldShutdown}
   */
  shouldShutdown: boolean;
  smokerPkgJson?: PackageJson;

  /**
   * Timestamp; when the machine started
   */
  startTime: number;
  staticPlugins: StaticPluginMetadata[];
  systemExecutor: Executor;
  workspaceInfo: WorkspaceInfo[];
}

/**
 * Input for {@link CtrlMachine}
 */

export interface CtrlMachineInput {
  defaultExecutor?: Executor;
  fileManager?: FileManager;
  pluginRegistry: PluginRegistry;

  /**
   * If `true`, the machine should shutdown after completing its work
   */
  shouldShutdown?: boolean;
  smokerOptions: SmokerOptions;
  systemExecutor?: Executor;
}
