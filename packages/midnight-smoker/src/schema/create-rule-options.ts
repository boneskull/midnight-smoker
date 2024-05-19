import {DEFAULT_RULE_SEVERITY} from '#constants';
import {getDefaultRuleOptions} from '#rule/create-rule-options';
import {dualCasedObjectSchema} from '#util/schema-util';
import {isEmpty, memoize} from 'lodash';
import z from 'zod';
import {type RuleDefSchemaValue} from './rule-def-schema-value';
import {RuleSeveritySchema, type RuleSeverity} from './rule-severity';

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
