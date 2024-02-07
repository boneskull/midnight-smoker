import {z} from 'zod';
import {StaticRuleContextSchema, StaticRuleSchema} from './rule-static';

export const RuleOkSchema = z.object({
  rule: StaticRuleSchema,
  context: StaticRuleContextSchema,
});

export type RuleOk = z.infer<typeof RuleOkSchema>;
