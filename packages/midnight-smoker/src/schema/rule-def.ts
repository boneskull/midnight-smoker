import {type RuleContext} from '#rule/rule-context';
import {type RuleDefSchemaValue} from '#schema/rule-def-schema-value';
import {StaticRuleDefSchema, type StaticRuleDef} from '#schema/rule-static';
import {AbortSignalSchema} from '#util/schema-util';
import {z} from 'zod';
import {type RuleOptions} from './rule-options';

/**
 * The raw definition of a {@link Rule}, as defined by a implementor.
 *
 * @public
 */

export interface RuleDef<Schema extends RuleDefSchemaValue | void = void>
  extends StaticRuleDef {
  name: string;

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
  signal?: AbortSignal,
) => void | Promise<void>;

export const RuleDefSchemaValueSchema = z.custom<RuleDefSchemaValue | void>(
  (val) => val === undefined || val instanceof z.ZodObject,
);

/**
 * XXX: Unclear how to check the return type, since it can be async; Zod throws
 * an exception and I'm unsure why.
 */
export const RuleCheckFnSchema = z.union([
  z.function().args(z.any(), z.any()).returns(z.void()),
  z.function().args(z.any(), z.any(), AbortSignalSchema).returns(z.void()),
  z.function().args(z.any(), z.any()).returns(z.promise(z.void())),
  z
    .function()
    .args(z.any(), z.any(), AbortSignalSchema)
    .returns(z.promise(z.void())),
]);

export const RuleDefSchema = StaticRuleDefSchema.extend({
  schema: RuleDefSchemaValueSchema.optional(),
  check: RuleCheckFnSchema,
});
