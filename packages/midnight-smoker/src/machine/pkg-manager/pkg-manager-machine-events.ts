import {type StaticComponent} from '#component';
import {type ComponentKinds} from '#constants';
import {type RuleError} from '#error';
import {type PackError, type PackParseError} from '#error/pkg-manager';
import {type PkgManagerSpec} from '#pkg-manager';
import {
  type InstallManifest,
  type LintManifest,
  type RuleResultFailed,
  type RuleResultOk,
  type SomeRule,
  type SomeRuleConfig,
  type StaticPkgManagerSpec,
  type WorkspaceInfo,
} from '#schema';
import {type PackageJson} from 'type-fest';

export type CheckOutput = CheckOutputOk | CheckOutputFailed;

export type PkgManagerMachineEvents =
  | PkgManagerMachinePackDoneEvent
  | PkgManagerMachineLintItemEvent
  | PkgManagerMachinePackErrorEvent
  | PkgManagerMachineCheckDoneEvent
  | PkgManagerMachineHaltEvent
  | PkgManagerMachineCheckErrorEvent
  | PkgManagerMachinePackEvent
  | PkgManagerMachineRuleEndEvent
  | PkgManagerMachineLintEvent;

export interface CheckInput extends CheckItem {
  config: SomeRuleConfig;
  pkgManager: PkgManagerSpec;
  rule: SomeRule;
}

/**
 * Represents a single package to be linted
 */
export interface CheckItem {
  manifest: LintManifest;
  pkgJson: PackageJson;
  pkgJsonPath: string;
  signal: AbortSignal;
}

export interface CheckOutputFailed extends CheckInput {
  result: RuleResultFailed[];
  type: 'FAILED';
}

export interface CheckOutputOk extends CheckInput {
  result: RuleResultOk;
  type: 'OK';
}

export interface PkgManagerMachineCheckDoneEvent {
  output: CheckOutput;
  type: 'xstate.done.actor.check.*';
}

export interface PkgManagerMachineCheckErrorEvent {
  error: RuleError;
  type: 'xstate.error.actor.check.*';
}

export interface PkgManagerMachineHaltEvent {
  type: 'HALT';
}

export interface PkgManagerMachineLintEvent {
  type: 'LINT';
}

export interface PkgManagerMachineLintItemEvent {
  output: CheckItem;
  type: 'xstate.done.actor.prepareLintItem.*';
}

export interface PkgManagerMachinePackDoneEvent {
  output: InstallManifest;
  type: 'xstate.done.actor.pack.*';
}

export interface PkgManagerMachinePackErrorEvent {
  error: PackError | PackParseError;
  type: 'xstate.error.actor.pack.*';
}

export interface PkgManagerMachinePackEvent {
  type: 'PACK';
  workspace: WorkspaceInfo;
}

export interface PkgManagerMachineReadyEvent {
  component: StaticComponent<typeof ComponentKinds.PkgManagerDef>;
  id: string;
  spec: StaticPkgManagerSpec;
  type: 'READY';
}

export interface PkgManagerMachineRuleEndEvent {
  type: 'RULE_END';

  output: CheckOutput;
}
