import {type FAILED, type OK} from '#constants';
import {
  type PackError,
  type PackParseError,
  type ScriptError,
} from '#error/pkg-manager';
import {type CheckResultFailed, type CheckResultOk} from '#schema/check-result';
import {type InstallManifest} from '#schema/install-manifest';
import {type LintManifest} from '#schema/lint-manifest';
import {type SomeRuleConfig, type SomeRuleOptions} from '#schema/rule-options';
import {type StaticRuleContext} from '#schema/rule-static';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {type RunScriptResult} from '#schema/run-script-result';
import {type SomeRuleDef} from '#schema/some-rule-def';

export type CheckOutput = CheckOutputOk | CheckOutputFailed;

export type PkgManagerMachineEvents =
  | PkgManagerMachinePackDoneEvent
  | PkgManagerMachineLintItemEvent
  | PkgManagerMachinePackErrorEvent
  | PkgManagerMachineHaltEvent
  | PkgManagerMachineRunScriptDoneEvent
  | PkgManagerMachineLintEvent
  | PkgManagerMachineRunScriptEvent
  | PkgManagerMachineCheckResultEvent
  | PkgManagerMachineRunScriptErrorEvent
  | PkgManagerMachineRuleEndEvent;

export interface CheckInput {
  ctx: StaticRuleContext;
  def: SomeRuleDef;
  opts: SomeRuleOptions;
  ruleId: string;

  /**
   * This is for round-tripping
   */
  manifest: LintManifest;
}

/**
 * Represents a single package to be linted
 */
export interface CheckItem {
  manifest: LintManifest;
  signal: AbortSignal;
}

export interface CheckOutputFailed extends CheckInput {
  result: CheckResultFailed[];
  actorId: string;
  type: typeof FAILED;
}

export interface CheckOutputOk extends CheckInput {
  result: CheckResultOk;
  actorId: string;
  type: typeof OK;
}

export interface PkgManagerMachineCheckResultEvent {
  output: CheckOutput;
  config: SomeRuleConfig;
  type: 'CHECK_RESULT';
}

export interface PkgManagerMachineHaltEvent {
  type: 'HALT';
}

export interface PkgManagerMachineLintEvent {
  manifest: LintManifest;
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

export interface PkgManagerMachineRuleEndEvent {
  output: CheckOutput;
  config: SomeRuleConfig;
  sender: string;
  type: 'RULE_END';
}

export interface PkgManagerMachineRunScriptDoneEvent {
  output: RunScriptOutput;
  type: 'xstate.done.actor.runScript.*';
}

export interface PkgManagerMachineRunScriptErrorEvent {
  error: ScriptError;
  type: 'xstate.error.actor.runScript.*';
}

export interface PkgManagerMachineRunScriptEvent {
  manifest: RunScriptManifest;
  type: 'RUN_SCRIPT';
}

/**
 * Output of {@link runScript}
 */
export interface RunScriptOutput {
  manifest: RunScriptManifest;
  result: RunScriptResult;
}
