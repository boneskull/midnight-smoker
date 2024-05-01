import {type StaticRuleContext} from '#schema';
import {type RuleMachineOutput} from './rule-machine-types';

export interface LinterMachineRuleMachineDoneEvent {
  type: 'xstate.done.actor.RuleMachine.*';
  output: RuleMachineOutput;
}

export interface LinterMachineRuleBeginEvent {
  type: 'RULE_BEGIN';
  index: number;
  ctx: StaticRuleContext;
  sender: string;
}

export type LinterMachineEvents =
  | LinterMachineRuleMachineDoneEvent
  | LinterMachineRuleBeginEvent;
