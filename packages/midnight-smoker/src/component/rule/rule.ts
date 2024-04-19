import {ReifiedComponent} from '#component';
import {RuleSeverities} from '#constants';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type RuleCheckFn, type RuleDef} from '#schema/rule-def';
import {type RuleDefSchemaValue, type RuleOptions} from '#schema/rule-options';
import {RuleSeveritySchema, type RuleSeverity} from '#schema/rule-severity';
import type {StaticRule} from '#schema/rule-static';
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
  extends ReifiedComponent<RuleDef<Schema>>
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

  public constructor(
    id: string,
    def: RuleDef<Schema>,
    plugin: Readonly<PluginMetadata>,
  ) {
    super(id, def, plugin);
    this.name = def.name;
    this.description = def.description;
    this.defaultSeverity = def.defaultSeverity
      ? RuleSeveritySchema.parse(def.defaultSeverity)
      : RuleSeverities.Error;
    this.check = def.check;
    this.schema = def.schema;
    this.url = def.url;
  }

  public get defaultOptions() {
    return this.schema ? getDefaultRuleOptions(this.schema) : undefined;
  }

  /**
   * Returns the entire schema for the value of this rule in the `RuleConfig`
   * object.
   */
  public get ruleSchema() {
    const {schema} = this;

    const result = schema
      ? createRuleOptionsSchema(schema, this.defaultSeverity)
      : createRuleOptionsSchema(EmptyObjectSchema, this.defaultSeverity);

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
      id: this.id,
    };
  }

  public override toString(): string {
    return this.id;
  }

  public static create<Schema extends RuleDefSchemaValue | void = void>(
    this: void,
    id: string,
    ruleDef: RuleDef<Schema>,
    plugin: Readonly<PluginMetadata>,
  ) {
    const rule = new Rule(id, ruleDef, plugin);
    debug('Instantiated Rule %s from plugin %s', rule.name, plugin.id);
    return rule;
  }
}

export interface RuleConfig<Schema extends RuleDefSchemaValue | void = void> {
  severity: RuleSeverity;
  opts: RuleOptions<Schema>;
}
