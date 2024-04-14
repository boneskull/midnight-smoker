import {
  type LintManifest,
  type SomeRuleConfig,
  type StaticRule,
  type StaticRuleIssue,
} from '#schema';
import {type RunScriptManifest} from '../../component';
import {type LinterMachineOutput} from '../linter/linter-machine';
import {type RunMachineOutput} from '../runner/run-machine';

export type PMMEvents =
  | PMMInstallEvent
  | PMMSetupEvent
  | PMMRunScriptsEvent
  | PMMScriptRunnerDoneEvent
  | PMMHaltEvent
  | PMMWillRunScriptEvent
  | PMMRuleFailedEvent
  | PMMRuleMachineDoneEvent
  | PMMRuleOkEvent;

export interface PMMHaltEvent {
  type: 'HALT';
}

export interface PMMInstallEvent {
  type: 'INSTALL';
}

export interface PMMRunScriptsEvent {
  scripts: string[];
  type: 'RUN_SCRIPTS';
}

export interface PMMScriptRunnerDoneEvent {
  output: RunMachineOutput;
  type: 'xstate.done.actor.scriptRunner.*';
}

export interface PMMSetupEvent {
  type: 'SETUP';
}

export interface PMMWillRunScriptEvent {
  index: number;
  runScriptManifest: RunScriptManifest;
  type: 'WILL_RUN_SCRIPT';
}

export interface PMMBaseRuleEvent {
  config: SomeRuleConfig;
  current: number;
  rule: StaticRule;
}

export interface PMMRuleFailedEvent extends LintManifest, PMMBaseRuleEvent {
  type: 'RULE_FAILED';
  issues: StaticRuleIssue[];
}

export interface PMMRuleOkEvent extends LintManifest, PMMBaseRuleEvent {
  type: 'RULE_OK';
}

export interface PMMRuleMachineDoneEvent {
  type: 'xstate.done.actor.ruleMachine.*';
  output: LinterMachineOutput;
}
