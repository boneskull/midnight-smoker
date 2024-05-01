import {type ActorOutputOk} from '#machine/util';
import {
  type RuleContext,
  type RuleIssue,
  type RuleResultFailed,
  type SomeRule,
  type SomeRuleConfig,
  type StaticRuleContext,
} from '#rule';
import {type AnyActorRef} from 'xstate';

export interface RuleMachineInput {
  ctx: Readonly<RuleContext>;
  rule: SomeRule;
  config: SomeRuleConfig;
  index: number;
  parentRef: AnyActorRef;
}

export interface RuleMachineContext extends RuleMachineInput {
  issues?: readonly RuleIssue[];
}
// this machine does not exit with an error

export type RuleMachineOutput = ActorOutputOk<{
  issues: RuleResultFailed[];
  index: number;
  ctx: StaticRuleContext;
  rule: SomeRule;
}>;
