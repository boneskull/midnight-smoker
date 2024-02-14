import {
  type RuleErrorEventData,
  type RunRuleEventData,
  type RunRuleFailedEventData,
  type RunRuleOkEventData,
  type RunRulesBeginEventData,
  type RunRulesFailedEventData,
  type RunRulesOkEventData,
} from '#schema/rule-runner-events';

export interface RuleRunnerEvents {
  /**
   * Emitted when a rule begins execution.
   *
   * Emitted for each enabled rule for each package.
   *
   * @event
   */
  RunRuleBegin: RunRuleEventData;

  /**
   * Emitted whenever a rule creates a {@link RuleIssue} during execution.
   *
   * @event
   */
  RunRuleFailed: RunRuleFailedEventData;

  /**
   * Emitted when a rule completes execution without raising a {@link RuleIssue}.
   *
   * @event
   */
  RunRuleOk: RunRuleOkEventData;

  /**
   * Emitted once before any rules are executed.
   *
   * @event
   */
  RunRulesBegin: RunRulesBeginEventData;

  /**
   * Emitted once when one or more rules have raised
   * {@link RuleIssue RuleIssues}.
   *
   * @event
   */
  RunRulesFailed: Readonly<RunRulesFailedEventData>;

  /**
   * Emitted once when _no_ rules have raised {@link RuleIssue RuleIssues}.
   *
   * @event
   */
  RunRulesOk: Readonly<RunRulesOkEventData>;

  /**
   * Emitted when a rule throws an exception or rejects a `Promise`.
   *
   * An associated {@link RunRuleFailed} event will also be emitted immediately
   * thereafter.
   *
   * This should _not_ cause `midnight-smoker` to crash _unless_ something other
   * than an `Error` is thrown within or rejected from the rule implementation.
   *
   * @event
   */
  RuleError: RuleErrorEventData;
}
