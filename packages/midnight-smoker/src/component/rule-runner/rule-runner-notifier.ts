import {SmokerEvent} from '#event/event-constants.js';
import type {RuleRunnerEvents} from '#event/rule-runner-events.js';
import type {StrictEmitter} from '#event/strict-emitter.js';
import type {RuleRunnerNotifiers} from '#schema/rule-runner-notifier.js';
import {
  RuleBeginNotifierSchema,
  RuleErrorNotifierSchema,
  RuleFailedNotifierSchema,
  RuleOkNotifierSchema,
  RunRulesBeginNotifierSchema,
  RunRulesFailedNotifierSchema,
  RunRulesOkNotifierSchema,
} from '#schema/rule-runner-notifier.js';
import {RuleIssue} from '../rule/issue';

export type RuleRunnerEmitter = StrictEmitter<RuleRunnerEvents>;

export function createRuleRunnerNotifiers(
  smoker: RuleRunnerEmitter,
): RuleRunnerNotifiers {
  return {
    runRulesBegin: RunRulesBeginNotifierSchema.implement((data) => {
      smoker.emit(SmokerEvent.RunRulesBegin, data);
    }),
    runRulesOk: RunRulesOkNotifierSchema.implement((data) => {
      smoker.emit(SmokerEvent.RunRulesOk, data);
    }),
    runRulesFailed: RunRulesFailedNotifierSchema.implement((data) => {
      smoker.emit(SmokerEvent.RunRulesFailed, data);
    }),
    ruleBegin: RuleBeginNotifierSchema.implement((data) => {
      smoker.emit(SmokerEvent.RunRuleBegin, data);
    }),
    ruleOk: RuleOkNotifierSchema.implement((data) => {
      smoker.emit(SmokerEvent.RunRuleOk, data);
    }),
    ruleFailed: RuleFailedNotifierSchema.implement((data) => {
      // for stable results
      data.failed = data.failed.sort(RuleIssue.compare);
      smoker.emit(SmokerEvent.RunRuleFailed, data);
    }),
    ruleError: RuleErrorNotifierSchema.implement((data) => {
      smoker.emit(SmokerEvent.RuleError, data);
    }),
  };
}
