import {Rule} from '#rule/rule';
import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * Used for storing collections of {@link Rule} objects.
 */
export type SomeRule = Rule<any>;

export const SomeRuleSchema = instanceofSchema(Rule);

export const SomeRulesSchema = z.array(SomeRuleSchema);
