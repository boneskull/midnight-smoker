import {DEFAULT_RULE_SEVERITY} from '#constants';
import {getDefaultRuleOptions} from '#options/default-rule-options';
import {type RuleSchemaValue} from '#schema/rule-schema-value';
import {type RuleSeverity, RuleSeveritySchema} from '#schema/rule-severity';
import {isEmpty} from '#util/guard/common';
import {dualCasedObjectSchema} from '#util/schema-util';
import {memoize} from 'lodash';
import z from 'zod';

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
    schema: RuleSchemaValue,
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
      .transform(([severity, opts]) => ({opts, severity}));

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
      opts,
      severity: defaultSeverity,
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
        opts: defaultOpts,
        severity,
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
      opts: OptsSchema,
      severity: DefaultSeveritySchema,
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
