import z from 'zod';
import {
  zRuleErrorEventData,
  zRunRuleBeginEventData,
  zRunRuleFailedEventData,
  zRunRuleOkEventData,
  zRunRulesBeginEventData,
  zRunRulesFailedEventData,
  zRunRulesOkEventData,
} from '../../event/rule-events';
import {Component} from '../component';
import {zBaseNormalizedRuleOptionsRecord, zRuleIssue, zSomeRule} from '../rule';
import {zRuleOk} from '../rule/rule-result';

export const zRunRulesBeginNotifier = z
  .function(
    z.tuple([zRunRulesBeginEventData] as [
      eventData: typeof zRunRulesBeginEventData,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this ONCE before executing rules',
  );

export const zRuleBeginNotifier = z
  .function(
    z.tuple([zRunRuleBeginEventData] as [
      eventData: typeof zRunRuleBeginEventData,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this when about to execute a rule',
  );
export const zRuleOkNotifier = z
  .function(
    z.tuple([zRunRuleOkEventData] as [eventData: typeof zRunRuleOkEventData]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this when the rule execution succeeds',
  );
export const zRuleFailedNotifier = z
  .function(
    z.tuple([zRunRuleFailedEventData] as [
      eventData: typeof zRunRuleFailedEventData,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this when the rule execution fails',
  );
export const zRunRulesOkNotifier = z
  .function(
    z.tuple([zRunRulesOkEventData] as [eventData: typeof zRunRulesOkEventData]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this ONCE when ALL rule executions succeed',
  );
export const zRunRulesFailedNotifier = z
  .function(
    z.tuple([zRunRulesFailedEventData] as [
      eventData: typeof zRunRulesFailedEventData,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this ONCE when ANY rule executions fail',
  );

export const zRuleErrorNotifier = z
  .function(
    z.tuple([zRuleErrorEventData] as [eventData: typeof zRuleErrorEventData]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this when a rule throws an exception',
  );

export const zRunRulesManifest = z
  .array(z.string())
  .describe('Installation paths to check');

export type RunRulesManifest = z.infer<typeof zRunRulesManifest>;
export const zRuleRunnerNotifiers = z.custom<RuleRunnerNotifiers>();

export const zSomeRuleComponent = z.custom<
  Component<z.infer<typeof zSomeRule>>
>((value) => zSomeRule.safeParse(value).success);

export const zSomeRuleComponentArray = z.array(zSomeRuleComponent);

export const zRunRulesResult = z
  .object({
    issues: z
      .array(zRuleIssue)
      .describe('Flattened array of issues found in rules'),
    passed: z
      .array(zRuleOk)
      .describe(
        'Flattened array of results from rules which passed without issue',
      ),
  })
  .describe('Results for _all_ executed rules');
/**
 * The result of executing a single {@link Rule}.
 */

export type RunRulesResult = z.infer<typeof zRunRulesResult>;
export const zRuleRunner = z.function(
  z.tuple([
    zRuleRunnerNotifiers,
    zSomeRuleComponentArray,
    zBaseNormalizedRuleOptionsRecord,
    zRunRulesManifest,
  ] as [
    notifiers: typeof zRuleRunnerNotifiers,
    rules: typeof zSomeRuleComponentArray,
    ruleConfig: typeof zBaseNormalizedRuleOptionsRecord,
    runRulesManifest: typeof zRunRulesManifest,
  ]),
  z.promise(zRunRulesResult),
);
export interface RuleRunnerNotifiers {
  ruleBegin: z.infer<typeof zRuleBeginNotifier>;
  ruleError: z.infer<typeof zRuleErrorNotifier>;
  ruleFailed: z.infer<typeof zRuleFailedNotifier>;
  ruleOk: z.infer<typeof zRuleOkNotifier>;
  runRulesBegin: z.infer<typeof zRunRulesBeginNotifier>;
  runRulesFailed: z.infer<typeof zRunRulesFailedNotifier>;
  runRulesOk: z.infer<typeof zRunRulesOkNotifier>;
}

/**
 * @todo A RuleRunner should not need to return anything, since it operates
 *   solely by mutating `RuleContext` objects. This means get rid of the
 *   `RuleOk` schema, since we won't need it. `RuleOk` should be needed only for
 *   defining the `RunRuleOk` and/or `RunRulesOk` events. It may turn out that
 *   it is needed by these events, as I know there are some schemas for them--I
 *   just don't know why that'd be necessary (because I am too lazy to look
 *   right now)
 */
export type RuleRunner = z.infer<typeof zRuleRunner>;
