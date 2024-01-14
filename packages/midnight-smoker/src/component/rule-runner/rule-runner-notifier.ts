import {SmokerEvent} from '../../event/event-constants';
import type {RuleEvents} from '../../event/rule-events';
import type {StrictEmitter} from '../../event/strict-emitter';
import {RuleIssue} from '../rule/issue';
import type {RuleRunnerNotifiers} from './rule-runner-schema';
import {
  zRuleBeginNotifier,
  zRuleErrorNotifier,
  zRuleFailedNotifier,
  zRuleOkNotifier,
  zRunRulesBeginNotifier,
  zRunRulesFailedNotifier,
  zRunRulesOkNotifier,
} from './rule-runner-schema';

export function createRuleRunnerNotifiers(
  smoker: StrictEmitter<RuleEvents>,
): RuleRunnerNotifiers {
  return {
    runRulesBegin: zRunRulesBeginNotifier.implement((data) => {
      smoker.emit(SmokerEvent.RunRulesBegin, data);
    }),
    runRulesOk: zRunRulesOkNotifier.implement((data) => {
      smoker.emit(SmokerEvent.RunRulesOk, data);
    }),
    runRulesFailed: zRunRulesFailedNotifier.implement((data) => {
      smoker.emit(SmokerEvent.RunRulesFailed, data);
    }),
    ruleBegin: zRuleBeginNotifier.implement((data) => {
      smoker.emit(SmokerEvent.RunRuleBegin, data);
    }),
    ruleOk: zRuleOkNotifier.implement((data) => {
      smoker.emit(SmokerEvent.RunRuleOk, data);
    }),
    ruleFailed: zRuleFailedNotifier.implement((data) => {
      // for stable results
      data.failed = data.failed.sort(RuleIssue.compare);
      smoker.emit(SmokerEvent.RunRuleFailed, data);
    }),
    ruleError: zRuleErrorNotifier.implement((data) => {
      smoker.emit(SmokerEvent.RuleError, data);
    }),
  };
}
