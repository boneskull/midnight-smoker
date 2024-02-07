import {
  type RuleDefSchemaValue,
  type RuleOptions,
} from '#schema/rule-options.js';
import {RuleSeveritySchema} from '#schema/rule-severity.js';
import type {StaticRule} from '#schema/rule-static.js';
import {z} from 'zod';
import {type RuleContext} from '../rule/context';

/**
 * The raw definition of a {@link Rule}, as defined by a implementor.
 *
 * @public
 */

export interface RuleDef<
  Name extends string,
  Schema extends RuleDefSchemaValue | void = void,
> extends StaticRule {
  name: Name;

  /**
   * The function which actually performs the check.
   */
  check: RuleCheckFn<Schema>;

  /**
   * Options schema for this rule, if any
   */
  schema?: Schema;
}

/**
 * The function which actually performs the check within a {@link Rule}.
 *
 * This is defined in a {@link RuleDef} as the {@link Rule.check} prop.
 *
 * @public
 */
export type RuleCheckFn<Schema extends RuleDefSchemaValue | void = void> = (
  ctx: Readonly<RuleContext>,
  opts: RuleOptions<Schema>,
) => void | Promise<void>;

export const RuleDefSchemaValueSchema = z.custom<RuleDefSchemaValue | void>(
  (val) => val === undefined || val instanceof z.ZodObject,
);

/**
 * XXX: Unclear how to check the return type, since it can be async; Zod throws
 * an exception and I'm unsure why.
 */
export const RuleCheckFnSchema = z
  .function()
  .args(z.any(), z.any())
  .returns(z.any());

export const StaticRuleDefSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  defaultSeverity: RuleSeveritySchema.optional(),
  url: z.string().url().optional(),
});

export const RuleDefSchema = StaticRuleDefSchema.extend({
  schema: RuleDefSchemaValueSchema.optional(),
  check: RuleCheckFnSchema,
}); /**
 * Some {@link RuleDef}
 */

export type SomeRuleDef = RuleDef<string, RuleDefSchemaValue | void>;
