import type {PackageJson} from 'read-pkg-up';
import {z} from 'zod';
import type {RuleSeverity} from './rule-config';
import type {CheckFailure} from './result';
import {RuleSeverities, RuleSeveritySchema} from './severity';

/**
 * The bits of a {@linkcode CheckContext} suitable for serialization.
 * @internal
 */
export interface StaticCheckContext {
  pkgJson: PackageJson;
  pkgJsonPath: string;
  pkgPath: string;
  severity: RuleSeverity;
}

/**
 * The `fail` function that a {@linkcode RuleCheckFn} uses to create a
 * {@linkcode CheckFailure}. The {@linkcode RuleCheckFn} then returns an array
 * of these.
 */
export type CheckContextFailFn = (message: string, data?: any) => CheckFailure;

/**
 * A context object which is provided to a {@linkcode RuleCheckFn}, containing
 * information about the current package to be checked and how to report a
 * failure.
 *
 * @public
 */
export class CheckContext<
  const Name extends string = string,
  Schema extends z.ZodTypeAny = z.ZodUndefined,
> implements StaticCheckContext
{
  /**
   * The parsed `package.json` for the package being checked.
   *
   * _Not_ normalized.
   */
  public readonly pkgJson: PackageJson;
  /**
   * The absolute path to this context's package's `package.json`.
   */
  public readonly pkgJsonPath: string;
  /**
   * The absolute path to this context's package's root directory.
   *
   * This is the same as `path.dirname(pkgJsonPath)`
   */
  public readonly pkgPath: string;
  /**
   * The severity level for this rule (as chosen by the user)
   */
  public readonly severity: RuleSeverity;

  /**
   * The `fail` function as provided to the `Rule`'s {@linkcode RuleCheckFn}.
   */
  public readonly fail: CheckContextFailFn;

  constructor(rule: Rule<Name, Schema>, staticCtx: StaticCheckContext) {
    this.pkgJson = staticCtx.pkgJson;
    this.pkgJsonPath = staticCtx.pkgJsonPath;
    this.pkgPath = staticCtx.pkgPath;
    this.severity = staticCtx.severity;
    this.fail = this.createFailFn(rule);
  }

  /**
   * Creates a `fail` function for {@linkcode RuleCheckFn}.
   * @param rule The `Rule` which will receive the `fail` function
   * @returns A `fail` function
   */
  private createFailFn(rule: Rule<Name, Schema>): CheckContextFailFn {
    return (message, data) => ({
      rule,
      message,
      data,
      context: this,
      failed: true,
    });
  }

  /**
   * Omits the {@linkcode CheckContext.pkgJson} property (too big).
   *
   * @returns A JSON-serializable representation of this object
   */
  toJSON() {
    return {
      pkgJsonPath: this.pkgJsonPath,
      pkgPath: this.pkgPath,
      severity: this.severity,
    };
  }
}

/**
 * The bits of a {@linkcode RuleDef} suitable for passing the API edge
 */
export interface StaticRuleDef<Name extends string = string> {
  readonly defaultSeverity?: RuleSeverity;
  readonly description: string;
  readonly name: Name;
}

/**
 * The parsed and validated options for a {@linkcode Rule}.
 */
export type RuleOpts<Schema extends z.ZodTypeAny = z.ZodUndefined> =
  z.infer<Schema>;

/**
 * The type _returned or fulfilled_ by the {@linkcode Rule.check} method.
 */
export type RuleCheckFnResult = CheckFailure[] | undefined;

/**
 * The function which actually performs the check within a {@linkcode Rule}
 * @public
 */
export type RuleCheckFn<
  Name extends string = string,
  Schema extends z.ZodTypeAny = z.ZodUndefined,
> = (
  ctx: CheckContext<Name, Schema>,
  opts?: RuleOpts<Schema>,
) => Promise<RuleCheckFnResult> | RuleCheckFnResult;

/**
 * The raw definition of a {@linkcode Rule}, as defined by a implementor.
 * @public
 */
export interface RuleDef<
  Name extends string = string,
  Schema extends z.ZodTypeAny = z.ZodUndefined,
> extends StaticRuleDef<Name> {
  /**
   * The function which actually performs the check.
   */
  readonly check: RuleCheckFn<Name, Schema>;

  /**
   * Options schema for this rule, if any
   */
  readonly schema?: Schema;
}

/**
 * Represents a _Rule_, which performs a check upon an installed (from tarball) package.
 * @internal
 */
export class Rule<
  const Name extends string = string,
  Schema extends z.ZodTypeAny = z.ZodUndefined,
> implements RuleDef<Name, Schema>
{
  /**
   * The name for this rule.
   *
   * @todo enforce uniqueness
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
  public readonly check: RuleCheckFn<Name, Schema>;

  /**
   * The options schema for this rule, if any
   */
  public readonly schema: Schema;

  /**
   * A composable schema handling the default severity for this rule
   */
  private readonly ruleSeveritySchema: z.ZodDefault<typeof RuleSeveritySchema>;

  constructor(def: RuleDef<Name, Schema>) {
    this.name = def.name;
    this.description = def.description;
    this.defaultSeverity = def.defaultSeverity ?? RuleSeverities.ERROR;
    this.check = def.check;
    // TODO determine if this is Bad
    this.schema = def.schema ?? (z.undefined() as Schema);
    this.ruleSeveritySchema = RuleSeveritySchema.default(this.defaultSeverity);
  }

  /**
   * Returns the entire schema for the value of this rule in the `RuleConfig` object.
   */
  get ruleSchema() {
    return z
      .union([
        this.ruleSeveritySchema,
        this.schema,
        z.tuple([this.schema]),
        z.tuple([this.schema, this.ruleSeveritySchema]),
      ])
      .optional();
  }

  /**
   * Creates a {@linkcode RuleCont}.
   *
   * Wrap a {@linkcode Rule} in this function to allow it to be used in a
   * collection of some sort.
   */
  toRuleCont() {
    return <R>(
      cont: <
        const Name extends string,
        Schema extends z.ZodTypeAny = z.ZodUndefined,
      >(
        rule: Rule<Name, Schema>,
      ) => R,
    ) => cont(this);
  }

  /**
   * Returns this `Rule` in a format suitable for serialization.
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
    };
  }
}

/**
 * A continuation for a {@link Rule}.
 *
 * This devilry is an for an existential type; it allows us to iterate over a
 * list of rules having different generic type parameters.
 *
 * @internal
 * @see {@link https://jalo.website/existential-types-in-typescript-through-continuations}
 */
export type RuleCont = <R>(
  cont: <
    const Name extends string,
    Schema extends z.ZodTypeAny = z.ZodUndefined,
  >(
    rule: Rule<Name, Schema>,
  ) => R,
) => R;

/**
 * {@linkcode Rule} factory.
 *
 * Rules use this to create themselves from raw {@linkcode RuleDef RuleDefs}.
 * @param ruleDef - Raw rule definition
 * @returns A new {@linkcode Rule}
 */
export function createRule<
  const Name extends string,
  Schema extends z.ZodTypeAny = z.ZodUndefined,
>(ruleDef: RuleDef<Name, Schema>): Rule<Name, Schema> {
  return new Rule(ruleDef);
}
