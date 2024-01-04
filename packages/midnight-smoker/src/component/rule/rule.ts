import Debug from 'debug';
import {isEmpty, memoize} from 'lodash';
import z from 'zod';
import {
  dualCasedObjectSchema,
  instanceofSchema,
  zEmptyObject,
} from '../../schema-util';
import type {Component, Owner} from '../component';
import {component} from '../component';
import {ComponentKinds} from '../component-kind';
import type {RuleContext} from './context';
import {
  DEFAULT_RULE_SEVERITY,
  RuleSeverities,
  zRuleSeverity,
  type RuleSeverity,
} from './severity';
import type {StaticRule} from './static';

const debug = Debug('midnight-smoker:rule');

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
export type RuleOptionSchema<
  UnknownKeys extends z.UnknownKeysParam = z.UnknownKeysParam,
> = z.ZodObject<Omit<Record<string, z.ZodTypeAny>, 'opts'>, UnknownKeys>;

/**
 * Options for a specific {@link Rule}.
 *
 * @public
 */
export type RuleOptions<Schema extends RuleOptionSchema | void> =
  Schema extends RuleOptionSchema
    ? z.infer<Schema>
    : z.infer<typeof zEmptyObject>;

/**
 * The function which actually performs the check within a {@link Rule}.
 *
 * This is defined in a {@link RuleDef} as the {@link Rule.check} prop.
 *
 * @public
 */
export type RuleCheckFn<Schema extends RuleOptionSchema | void = void> = (
  ctx: Readonly<RuleContext>,
  opts: RuleOptions<Schema>,
) => void | Promise<void>;

/**
 * The raw definition of a {@link Rule}, as defined by a implementor.
 *
 * @public
 */
export interface RuleDef<
  Name extends string,
  Schema extends RuleOptionSchema | void = void,
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

const zRoughRuleOptionSchema = z.custom<RuleOptionSchema | void>(
  (val) => val === undefined || val instanceof z.ZodObject,
);

/**
 * XXX: Unclear how to check the return type, since it can be async; Zod throws
 * an exception and I'm unsure why.
 */
const zRoughRuleCheckFn = z.function().args(z.any(), z.any()).returns(z.any());

export const zRoughStaticRuleDef = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  defaultSeverity: zRuleSeverity.optional(),
  url: z.string().url().optional(),
});

export const zRoughRuleDef = zRoughStaticRuleDef.extend({
  schema: zRoughRuleOptionSchema.optional(),
  check: zRoughRuleCheckFn,
});

export function isPartialRuleDef<
  const Name extends string,
  Schema extends RuleOptionSchema | void = void,
>(value: any): value is Partial<RuleDef<Name, Schema>> {
  return zRoughRuleDef.partial().safeParse(value).success;
}

/**
 * Used for storing collections of {@link Rule} objects.
 */
export type SomeRule = Rule<string, RuleOptionSchema | void>;

/**
 * Some {@link RuleDef}
 */
export type SomeRuleDef = RuleDef<string, RuleOptionSchema | void>;

/**
 * Represents a _Rule_, which performs a logical grouping of checks upon an
 * installed (from tarball) package.
 */
export class Rule<
  const Name extends string,
  Schema extends RuleOptionSchema | void = void,
> implements RuleDef<Name, Schema>
{
  /**
   * The name for this rule.
   *
   * @todo Enforce uniqueness
   */
  public readonly name: Name;
  /**
   * The description for this rule
   */
  public readonly description: string;

  /**
   * The default severity for this rule if not supplied by the user
   */
  public readonly defaultSeverity: RuleSeverity;

  /**
   * The function which actually performs the check.
   */
  public readonly check: RuleCheckFn<Schema>;

  /**
   * The options schema for this rule, if any
   */
  public readonly schema?: Schema;

  public readonly url?: string;

  public constructor(def: RuleDef<Name, Schema>) {
    this.name = def.name;
    this.description = def.description;
    this.defaultSeverity = def.defaultSeverity
      ? zRuleSeverity.parse(def.defaultSeverity)
      : RuleSeverities.Error;
    this.check = def.check;
    this.schema = def.schema;
    this.url = def.url;
  }

  public static readonly componentKind = ComponentKinds.Rule;

  public get defaultOptions() {
    return this.schema ? Rule.getDefaultOpts(this.schema) : undefined;
  }

  /**
   * Returns the entire schema for the value of this rule in the `RuleConfig`
   * object.
   */
  public get zRuleSchema() {
    const {schema: zSchema} = this;

    const result = zSchema
      ? Rule.createRuleOptionsSchema(zSchema, this.defaultSeverity)
      : Rule.createRuleOptionsSchema(zEmptyObject, this.defaultSeverity);

    return result;
  }

  /**
   * Returns this `Rule` in a format suitable for serialization.
   */
  public toJSON(): StaticRule {
    return {
      defaultSeverity: this.defaultSeverity,
      name: this.name,
      description: this.description,
      url: this.url,
    };
  }

  public toString(this: Component<Rule<Name, Schema>>) {
    return this.id;
  }

  /**
   * Creates a schema to parse user-provided rule options for a given rule
   * schema and default severity.
   *
   * Returns an object containing the schema and the default rule-specific
   * options (not severity) as derived from the schema.
   *
   * Creates a new `shape` of the schema (if not empty) where options can be
   * both camelCased and kebab-cased.
   *
   * @internal
   */
  public static createRuleOptionsSchema = memoize(
    (
      schema: RuleOptionSchema,
      defaultSeverity: RuleSeverity = DEFAULT_RULE_SEVERITY,
    ) => {
      const emptyOpts = isEmpty(schema.shape);

      const defaultOpts = emptyOpts ? {} : Rule.getDefaultOpts(schema);

      const zOpts = emptyOpts
        ? schema.passthrough().default(defaultOpts)
        : dualCasedObjectSchema(schema).strict().default(defaultOpts);

      const zDefaultSeverity = zRuleSeverity.default(defaultSeverity);

      /**
       * Rule options as a tuple
       *
       * @example
       *
       * ```ts
       * const ruleOpts = {'some-rule': ['error', {foo: 'bar'}]};
       * ```;
       * ```
       */
      const zRuleOptsTuple = z
        .tuple([zDefaultSeverity, zOpts])
        .transform(([severity, opts]) => ({severity, opts}));

      /**
       * Rule options as a bare object; no severity
       *
       * @example
       *
       * ```ts
       * const ruleOpts = {'some-rule': {foo: 'bar'}};
       * ```;
       * ```
       */
      const zRuleOptsBareOpts = zOpts.transform((opts) => ({
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
       * ```;
       * ```
       */
      const zRuleOptsBareSeverity = zDefaultSeverity.transform((severity) => ({
        severity,
        opts: defaultOpts,
      }));

      /**
       * Normalized rule options
       *
       * @example
       *
       * ```ts
       * const ruleOpts = {'some-rule': {severity: 'error', opts: {foo: 'bar'}}};
       * ```;
       * ```
       */
      const zRuleOptsNormalized = z.strictObject({
        severity: zDefaultSeverity,
        opts: zOpts,
      });

      const finalSchema = z
        .union(
          [
            zRuleOptsBareOpts,
            zRuleOptsBareSeverity,
            zRuleOptsTuple,
            zRuleOptsNormalized,
          ],
          {description: zOpts.description ?? 'Rule-specific options'},
        )
        .pipe(zRuleOptsNormalized);

      return finalSchema;
    },
  );

  /**
   * Digs around in a {@link z.ZodRawShape} for defaults.
   *
   * Caches result.
   *
   * @internal
   */
  protected static getDefaultOpts<T extends RuleOptionSchema>(
    this: void,
    schema: T,
  ) {
    if (Rule.getDefaultOptsCache.has(schema)) {
      return Rule.getDefaultOptsCache.get(schema)!;
    }
    const emptyObjectResult = schema.safeParse({});
    const defaults = (
      emptyObjectResult.success ? emptyObjectResult.data : {}
    ) as z.infer<T>;
    Rule.getDefaultOptsCache.set(schema, defaults);
    return defaults;
  }

  protected static readonly getDefaultOptsCache = new WeakMap<
    RuleOptionSchema,
    Record<string, any>
  >();

  public static create<
    const Name extends string,
    const Id extends string = string,
    Schema extends RuleOptionSchema | void = void,
  >(this: void, ruleDef: RuleDef<Name, Schema>, owner: Owner<Id>) {
    const rule = component({
      name: ruleDef.name,
      value: new Rule(ruleDef),
      kind: Rule.componentKind,
      owner,
    });
    debug('Created Rule with ID %s', rule.id);
    return rule;
  }
}

export const zBaseRuleOptions = Rule.createRuleOptionsSchema(
  zEmptyObject.passthrough(),
);

export const zBaseRuleOptionsRecord = z
  .record(zBaseRuleOptions)
  .describe('Rule configuration for automated checks');

export const zBaseNormalizedRuleOptions = z.strictObject({
  severity: zRuleSeverity,
  opts: z.object({}).passthrough(),
});

export const zBaseNormalizedRuleOptionsRecord = z
  .record(zBaseNormalizedRuleOptions)
  .describe('Rule configuration for automated checks');

export type BaseRuleOptions = z.input<typeof zBaseRuleOptions>;
export type BaseRuleOptionsRecord = z.input<typeof zBaseRuleOptionsRecord>;

export type BaseNormalizedRuleOptions = z.infer<
  typeof zBaseNormalizedRuleOptions
>;

export type BaseNormalizedRuleOptionsRecord = z.infer<
  typeof zBaseNormalizedRuleOptionsRecord
>;

export interface RuleConfig<Schema extends RuleOptionSchema | void = void> {
  severity: RuleSeverity;
  opts: RuleOptions<Schema>;
}

export const zSomeRule = instanceofSchema(Rule);
