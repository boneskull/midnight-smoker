import {z} from 'zod';
import {RuleError} from '../component/rule-runner/rule-error';
import {zStaticRuleIssue} from '../component/rule/issue';
import {
  zBaseNormalizedRuleOptions,
  zBaseNormalizedRuleOptionsRecord,
} from '../component/rule/rule';
import {zRuleOk} from '../component/rule/rule-result';
import {
  instanceofSchema,
  serializeObject,
  zNonEmptyString,
  zNonNegativeInteger,
} from '../util/schema-util';

export interface RuleEvents {
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
export type RunRulesBeginEventData = z.infer<typeof zRunRulesBeginEventData>;
export type RunRuleEventData = z.infer<typeof zRunRuleEventData>;

export type RunRuleBeginEventData = RunRuleEventData;

export type RunRuleOkEventData = RunRuleEventData;

export type RunRuleFailedEventData = z.infer<typeof zRunRuleFailedEventData>;

export type RunRulesFailedEventData = z.infer<typeof zRunRulesFailedEventData>;
export type RunRulesOkEventData = z.infer<typeof zRunRulesOkEventData>;

export type RuleErrorEventData = z.infer<typeof zRuleErrorEventData>;
export const zRunRulesBeginEventData = z.object({
  config: zBaseNormalizedRuleOptionsRecord.describe(
    'The entire rule configuration, as defined by the user and default values',
  ),
  total: zNonNegativeInteger.describe('Total count of unique rules'),
});

export const zRunRuleEventData = z
  .object({
    rule: zNonEmptyString.describe('ID of the rule to run'),
    config: zBaseNormalizedRuleOptions.describe('Specific rule configuration'),
    current: zNonNegativeInteger.describe('Current rule position in the total'),
    total: zNonNegativeInteger.describe('Total count of unique rules'),
    installPath: zNonEmptyString.describe(
      'Install path of package being checked',
    ),
    pkgName: zNonEmptyString.describe('Name of package being checked'),
  })
  .describe('Base object for RunRule* events');

export const zRunRuleBeginEventData = zRunRuleEventData;

export const zRunRuleOkEventData = zRunRuleEventData;

export const zRunRuleFailedEventData = zRunRuleEventData.setKey(
  'failed',
  z
    .array(serializeObject(zStaticRuleIssue))
    .describe('List of issues raised by a single rule exection'),
);

export const zRunRulesOkEventData = zRunRulesBeginEventData.setKey(
  'passed',
  z.array(zRuleOk).describe('List of rules which ran without issue'),
);
// FIXME: "failed" should be "issues" since some may be warnings

export const zRunRulesFailedEventData = zRunRulesOkEventData.setKey(
  'failed',
  z.array(zStaticRuleIssue).describe('List of issues raised by all rules'),
);

export const zRuleErrorEventData = instanceofSchema(RuleError);
