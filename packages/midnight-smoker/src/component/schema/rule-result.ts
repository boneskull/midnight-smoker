import {z} from 'zod';
import {StaticRuleContextSchema, StaticRuleDefSchema} from './rule-static';

export const RuleOkSchema = z.object({
  rule: StaticRuleDefSchema,
  context: StaticRuleContextSchema,
});

export type RuleOk = z.infer<typeof RuleOkSchema>;
