import {type RuleContext} from '#rule/rule-context';
import {AbortSignalSchema} from '#schema/abort-signal';
import {type RuleOptions} from '#schema/rule-options';
import {
  type RuleSchemaValue,
  RuleSchemaValueSchema,
} from '#schema/rule-schema-value';
import {asObjectSchema, multiColorFnSchema} from '#util/schema-util';
import {z} from 'zod';

import {type StaticRule, StaticRuleSchema} from './static-rule';

/**
 * The function which actually performs the check within a {@link Rule}.
 *
 * This is defined in a {@link Rule} as the {@link Rule.check} prop.
 *
 * @public
 */
export type RuleCheckFn<Schema extends RuleSchemaValue | void = void> = (
  ctx: Readonly<RuleContext>,
  opts: RuleOptions<Schema>,
  signal?: AbortSignal,
) => Promise<void> | void;

/**
 * Some `Rule`, suitable for direct manipulation
 */
export type SomeRule = Rule<RuleSchemaValue | void>;

/**
 * The raw definition of a `Rule`, as defined by a plugin
 *
 * @public
 */
export interface Rule<Schema extends RuleSchemaValue | void = void>
  extends StaticRule {
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
 * XXX: Unclear how to check the return type, since it can be async; Zod throws
 * an exception and I'm unsure why.
 */
export const RuleCheckFnSchema = z.union([
  multiColorFnSchema(z.function(z.tuple([z.any(), z.any()]), z.void())),
  multiColorFnSchema(
    z.function(z.tuple([z.any(), z.any(), AbortSignalSchema]), z.void()),
  ),
]);

/**
 * Base schema for a `Rule`.
 */
export const BaseRuleSchema = StaticRuleSchema.extend({
  check: RuleCheckFnSchema,
  schema: RuleSchemaValueSchema.optional(),
}).passthrough();

/**
 * User-facing schema for a `Rule`, which allows class instances
 */
export const RuleSchema = asObjectSchema(BaseRuleSchema).describe(
  'A Rule as defined by a plugin',
);

/**
 * A _partial_ {@link Rule}. Used for testing utilities
 */
export const PartialRuleSchema = asObjectSchema(
  BaseRuleSchema.partial(),
).describe('A partial Rule as defined by a plugin');
