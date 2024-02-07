import type {Component} from '#component';
import {Rule} from '#rule/rule.js';
import {instanceofSchema} from '#util/schema-util.js';
import {z} from 'zod';
import {type RuleDefSchemaValue} from './rule-options';

/**
 * Used for storing collections of {@link Rule} objects.
 */
export type SomeRule = Rule<string, RuleDefSchemaValue | void>;
export const SomeRuleSchema = instanceofSchema(Rule);

export const RuleComponentsSchema = z.array(
  z.custom<Component<z.infer<typeof SomeRuleSchema>>>(
    (value) => SomeRuleSchema.safeParse(value).success,
  ),
);
