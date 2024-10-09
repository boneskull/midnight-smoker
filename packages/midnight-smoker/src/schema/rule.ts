import {type RuleCheckFn} from '#defs/rule';
import {AbortSignalSchema} from '#schema/abort-signal';
import {RuleSchemaValueSchema} from '#schema/rule-schema-value';
import {StaticRuleSchemaShape} from '#schema/static-rule';
import {asObjectSchema, multiColorFnSchema} from '#util/schema-util';
import {z} from 'zod';

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
