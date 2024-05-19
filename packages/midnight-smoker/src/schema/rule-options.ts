import {DEFAULT_RULE_SEVERITY} from '#constants';
import {getDefaultRuleOptions} from '#rule/create-rule-options';
import {RuleSeveritySchema, type RuleSeverity} from '#schema/rule-severity';
import {EmptyObjectSchema, dualCasedObjectSchema} from '#util/schema-util';
import {isEmpty, memoize} from 'lodash';
import {z} from 'zod';

export type BaseRuleConfigRecord = z.infer<typeof BaseRuleConfigRecordSchema>;

export type RuleConfig<Schema extends RuleDefSchemaValue | void> = {
  severity?: z.infer<typeof RuleSeveritySchema>;
  opts?: Schema extends RuleDefSchemaValue
    ? RuleOptions<Schema>
    : z.infer<typeof EmptyObjectSchema>;
};

/**
 * A schema for a rule's options; this is the {@link RuleDef.schema} prop as
 * defined by a plugin author.
 *
 * The schema must be a {@link z.ZodObject} and each member of the object's shape
 * must either be _optional_ or have a _default_ value.
 *
 * @see {@link https://zod.dev/?id=json-type}
 * @todo There are certain Zod types which we should disallow. The value must be
 *   expressible as JSON.
 *
 * @todo `opts` is disallowed as an option name; probably need a tsd test for it
 *
 * @todo The value of in the shape of the ZodObject needs to accept an input
 *   value of `undefined`.
 *
 * @todo Evaluate whether or not other, non-object types should be allowed as
 *   rule-specific options
 */
export type RuleDefSchemaValue<
  UnknownKeys extends z.UnknownKeysParam = z.UnknownKeysParam,
> = z.ZodObject<Omit<Record<string, z.ZodTypeAny>, 'opts'>, UnknownKeys>;

/**
 * Options for a specific {@link Rule}.
 *
 * @public
 */
export type RuleOptions<Schema extends RuleDefSchemaValue | void> =
  Schema extends RuleDefSchemaValue
    ? z.infer<Schema>
    : z.infer<typeof EmptyObjectSchema>;

export type SomeRuleConfig = z.infer<typeof BaseRuleConfigSchema>;

export type SomeRuleOptions = z.infer<typeof SomeRuleOptionsSchema>;

/**
 * Creates a schema to parse user-provided rule options for a given rule schema
 * and default severity.
 *
 * Returns an object containing the schema and the default rule-specific options
 * (not severity) as derived from the schema.
 *
 * Creates a new `shape` of the schema (if not empty) where options can be both
 * camelCased and kebab-cased.
 *
 * @internal
 */
export const createRuleOptionsSchema = memoize(
  (
    schema: RuleDefSchemaValue,
    defaultSeverity: RuleSeverity = DEFAULT_RULE_SEVERITY,
  ) => {
    const emptyOpts = isEmpty(schema.shape);

    const defaultOpts = emptyOpts ? {} : getDefaultRuleOptions(schema);

    const OptsSchema = emptyOpts
      ? schema.passthrough().default(defaultOpts)
      : dualCasedObjectSchema(schema).strict().default(defaultOpts);

    const DefaultSeveritySchema = RuleSeveritySchema.default(defaultSeverity);

    /**
     * Rule options as a tuple
     *
     * @example
     *
     * ```ts
     * const ruleOpts = {'some-rule': ['error', {foo: 'bar'}]};
     * ```
     */
    const RuleOptsTupleSchema = z
      .tuple([DefaultSeveritySchema, OptsSchema])
      .transform(([severity, opts]) => ({severity, opts}));

    /**
     * Rule options as a bare object; no severity
     *
     * @example
     *
     * ```ts
     * const ruleOpts = {'some-rule': {foo: 'bar'}};
     * ```
     */
    const RuleOptsBareSchema = OptsSchema.transform((opts) => ({
      severity: defaultSeverity,
      opts,
    }));

    /**
     * Rule options as severity only
     *
     * @example
     *
     * ```ts
     * const ruleOpts = {'some-rule": 'error'};
     * ```
     */
    const RuleOptsBareSeveritySchema = DefaultSeveritySchema.transform(
      (severity) => ({
        severity,
        opts: defaultOpts,
      }),
    );

    /**
     * Normalized rule options
     *
     * @example
     *
     * ```ts
     * const ruleOpts = {
     *   'some-rule': {severity: 'error', opts: {foo: 'bar'}},
     * };
     * ```
     */
    const RuleOptsNormalizedSchema = z.strictObject({
      severity: DefaultSeveritySchema,
      opts: OptsSchema,
    });

    const FinalRuleOptionsSchema = z
      .union(
        [
          RuleOptsBareSchema,
          RuleOptsBareSeveritySchema,
          RuleOptsTupleSchema,
          RuleOptsNormalizedSchema,
        ],
        {description: OptsSchema.description ?? 'Rule-specific options'},
      )
      .pipe(RuleOptsNormalizedSchema);

    return FinalRuleOptionsSchema;
  },
);

export const SomeRuleOptionsSchema = EmptyObjectSchema.passthrough();

export const RawRuleOptionsSchema = createRuleOptionsSchema(
  SomeRuleOptionsSchema,
);

export const RawRuleOptionsRecordSchema = z
  .record(RawRuleOptionsSchema)
  .describe('Rule configuration for automated checks');

export const BaseRuleConfigSchema = z.strictObject({
  severity: RuleSeveritySchema,
  opts: SomeRuleOptionsSchema,
});

export const BaseRuleConfigRecordSchema = z
  .record(BaseRuleConfigSchema)
  .describe('Rule configuration for automated checks');
