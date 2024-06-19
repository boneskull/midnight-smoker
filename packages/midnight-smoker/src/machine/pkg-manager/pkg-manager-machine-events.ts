// TODO meta schema
import {type ERROR, type FAILED, type OK} from '#constants';
import {
  type PackError,
  type PackParseError,
  type ScriptError,
} from '#error/pkg-manager';
import {type RuleError} from '#error/rule-error';
import {type CheckFailed, type CheckOk} from '#schema/check-result';
import {type InstallManifest} from '#schema/install-manifest';
import {type LintManifest} from '#schema/lint-manifest';
import {type SomeRuleConfig} from '#schema/rule-options';
import {type StaticRuleContext} from '#schema/rule-static';
import {type RunScriptManifest} from '#schema/run-script-manifest';
import {type RunScriptResult} from '#schema/run-script-result';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type Result} from '#util/result';
import {type AbortEvent} from '../util/abort-event';

export type CheckOutput = CheckOutputOk | CheckOutputFailed;

export type PkgManagerMachineEvents =
  | PkgManagerMachinePackDoneEvent
  | PkgManagerMachinePackErrorEvent
  | PkgManagerMachineHaltEvent
  | PkgManagerMachineRunScriptDoneEvent
  | PkgManagerMachineLintEvent
  | PkgManagerMachineRunScriptEvent
  | PkgManagerMachineCheckResultEvent
  | PkgManagerMachineRunScriptErrorEvent
  | PkgManagerMachineRuleEndEvent
  | PkgManagerMachineCheckErrorEvent
  | PkgManagerMachinePrepareLintManifestDoneEvent
  | PkgManagerMachinePrepareLintManifestErrorEvent
  | AbortEvent;

export interface BaseCheckOutput {
  config: SomeRuleConfig;
  installPath: string;
  manifest: Result<LintManifest>;
  ruleId: string;
}

export interface CheckInput {
  config: SomeRuleConfig;
  ctx: StaticRuleContext;
  def: SomeRuleDef;

  /**
   * This is for round-tripping
   */
  manifest: LintManifest;
  ruleId: string;
}

export interface CheckOutputError extends BaseCheckOutput {
  error: RuleError;
  type: typeof ERROR;
}

export interface CheckOutputFailed extends BaseCheckOutput {
  actorId: string;
  result: CheckFailed[];
  type: typeof FAILED;
}

export interface CheckOutputOk extends BaseCheckOutput {
  actorId: string;
  result: CheckOk;
  type: typeof OK;
}

export interface PkgManagerMachineCheckErrorEvent {
  output: CheckOutputError;
  type: 'CHECK_ERROR';
}

export interface PkgManagerMachineCheckResultEvent {
  output: CheckOutput;
  type: 'CHECK_RESULT';
}

export interface PkgManagerMachineHaltEvent {
  type: 'HALT';
}

export interface PkgManagerMachineLintEvent {
  workspaceInfo: WorkspaceInfo;
  installPath: string;
  type: 'LINT';
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
  config: SomeRuleConfig;
  output: CheckOutput;
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

export interface PkgManagerMachinePrepareLintManifestDoneEvent {
  output: LintManifest;
  type: 'xstate.done.actor.prepareLintManifest.*';
}

export interface PkgManagerMachinePrepareLintManifestErrorEvent {
  error: Error;
  type: 'xstate.error.actor.prepareLintManifest.*';
}

/**
 * Output of {@link runScript}
 */
export interface RunScriptOutput {
  manifest: RunScriptManifest;
  result: RunScriptResult;
}
