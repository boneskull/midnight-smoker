import {
  RuleBeginEventDataSchema,
  RuleErrorEventDataSchema,
  RuleFailedEventDataSchema,
  RuleOkEventDataSchema,
  RunRulesBeginEventDataSchema,
  RunRulesFailedEventDataSchema,
  RunRulesOkEventDataSchema,
} from '#schema/rule-runner-events';
import {z} from 'zod';

export const RunRulesBeginNotifierSchema = z
  .function(
    z.tuple([RunRulesBeginEventDataSchema] as [
      eventData: typeof RunRulesBeginEventDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this ONCE before executing rules',
  );

export const RuleBeginNotifierSchema = z
  .function(
    z.tuple([RuleBeginEventDataSchema] as [
      eventData: typeof RuleBeginEventDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this when about to execute a rule',
  );
export const RuleOkNotifierSchema = z
  .function(
    z.tuple([RuleOkEventDataSchema] as [
      eventData: typeof RuleOkEventDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this when the rule execution succeeds',
  );
export const RuleFailedNotifierSchema = z
  .function(
    z.tuple([RuleFailedEventDataSchema] as [
      eventData: typeof RuleFailedEventDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this when the rule execution fails',
  );
export const RunRulesOkNotifierSchema = z
  .function(
    z.tuple([RunRulesOkEventDataSchema] as [
      eventData: typeof RunRulesOkEventDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this ONCE when ALL rule executions succeed',
  );
export const RunRulesFailedNotifierSchema = z
  .function(
    z.tuple([RunRulesFailedEventDataSchema] as [
      eventData: typeof RunRulesFailedEventDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this ONCE when ANY rule executions fail',
  );

export const RuleErrorNotifierSchema = z
  .function(
    z.tuple([RuleErrorEventDataSchema] as [
      eventData: typeof RuleErrorEventDataSchema,
    ]),
    z.void(),
  )
  .describe(
    'A RuleRunner implementation should call this when a rule throws an exception',
  );

export const RuleRunnerNotifiersSchema = z.custom<RuleRunnerNotifiers>();

export interface RuleRunnerNotifiers {
  ruleBegin: z.infer<typeof RuleBeginNotifierSchema>;
  ruleError: z.infer<typeof RuleErrorNotifierSchema>;
  ruleFailed: z.infer<typeof RuleFailedNotifierSchema>;
  ruleOk: z.infer<typeof RuleOkNotifierSchema>;
  runRulesBegin: z.infer<typeof RunRulesBeginNotifierSchema>;
  runRulesFailed: z.infer<typeof RunRulesFailedNotifierSchema>;
  runRulesOk: z.infer<typeof RunRulesOkNotifierSchema>;
}
