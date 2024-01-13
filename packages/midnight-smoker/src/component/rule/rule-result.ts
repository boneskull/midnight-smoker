import {z} from 'zod';
import {zStaticRule, zStaticRuleContext} from './static';

export const zRuleOk = z.object({
  rule: zStaticRule,
  context: zStaticRuleContext,
});

export type RuleOk = z.infer<typeof zRuleOk>;
