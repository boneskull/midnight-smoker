import {
  ComponentKinds,
  createComponent,
  type Component,
  type Owner,
} from '#component';
import {RuleSeverities} from '#constants';
import {type RuleCheckFn, type RuleDef} from '#schema/rule-def';
import {type RuleDefSchemaValue, type RuleOptions} from '#schema/rule-options';
import {RuleSeveritySchema, type RuleSeverity} from '#schema/rule-severity';
import type {StaticRuleDef} from '#schema/rule-static';
import {EmptyObjectSchema} from '#util/schema-util';
import Debug from 'debug';
import {
  createRuleOptionsSchema,
  getDefaultRuleOptions,
} from './create-rule-options';

const debug = Debug('midnight-smoker:rule');

/**
 * Represents a _Rule_, which performs a logical grouping of checks upon an
 * installed (from tarball) package.
 */
export class Rule<Schema extends RuleDefSchemaValue | void = void>
  implements RuleDef<Schema>
{
  /**
   * The name for this rule.
   *
   * @todo Enforce uniqueness
   */
  public readonly name: string;

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

  public constructor(def: RuleDef<Schema>) {
    this.name = def.name;
    this.description = def.description;
    this.defaultSeverity = def.defaultSeverity
      ? RuleSeveritySchema.parse(def.defaultSeverity)
      : RuleSeverities.Error;
    this.check = def.check;
    this.schema = def.schema;
    this.url = def.url;
  }

  public static readonly componentKind = ComponentKinds.Rule;

  public get defaultOptions() {
    return this.schema ? getDefaultRuleOptions(this.schema) : undefined;
  }

  /**
   * Returns the entire schema for the value of this rule in the `RuleConfig`
   * object.
   */
  public get zRuleSchema() {
    const {schema: zSchema} = this;

    const result = zSchema
      ? createRuleOptionsSchema(zSchema, this.defaultSeverity)
      : createRuleOptionsSchema(EmptyObjectSchema, this.defaultSeverity);

    return result;
  }

  /**
   * Returns this `Rule` in a format suitable for serialization.
   */
  public toJSON(): StaticRuleDef {
    return {
      defaultSeverity: this.defaultSeverity,
      name: this.name,
      description: this.description,
      url: this.url,
    };
  }

  public toString(this: Component<Rule<Schema>>) {
    return this.id;
  }

  public static create<
    const Id extends string = string,
    Schema extends RuleDefSchemaValue | void = void,
  >(this: void, ruleDef: RuleDef<Schema>, owner: Owner<Id>) {
    const rule = createComponent({
      name: ruleDef.name,
      value: new Rule(ruleDef),
      kind: Rule.componentKind,
      owner,
    });
    debug('Created Rule with ID %s', rule.id);
    return rule;
  }
}

export interface RuleConfig<Schema extends RuleDefSchemaValue | void = void> {
  severity: RuleSeverity;
  opts: RuleOptions<Schema>;
}
