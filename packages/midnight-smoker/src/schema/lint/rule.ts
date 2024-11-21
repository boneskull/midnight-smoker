import {type RuleCheckFn} from '#defs/rule';
import {RuleSchemaValueSchema} from '#schema/lint/rule-schema-value';
import {StaticRuleSchemaShape} from '#schema/lint/static-rule';
import {AbortSignalSchema} from '#schema/util/abort-signal';
import {asObjectSchema, multiColorFnSchema} from '#util/schema-util';
import {z} from 'zod';

export * from '#defs/rule';

/**
 * @private
 */
export const RuleCheckFnSchema: z.ZodType<RuleCheckFn> = z.union([
  multiColorFnSchema(z.function(z.tuple([z.any(), z.any()]), z.void())),
  multiColorFnSchema(
    z.function(z.tuple([z.any(), z.any(), AbortSignalSchema]), z.void()),
  ),
]);

/**
 * Base schema for a `Rule`.
 *
 * @private
 */
export const BaseRuleSchema = z
  .object({
    ...StaticRuleSchemaShape,
    check: RuleCheckFnSchema,
    schema: RuleSchemaValueSchema.optional(),
  })
  .passthrough();

/**
 * Schema for a `Rule`.
 *
 * @private
 */
export const RuleSchema = asObjectSchema(BaseRuleSchema).describe(
  'A Rule as defined by a plugin',
);
