/**
 * Provides {@link RuleContext}, which is the object which `RuleCheckFn`s
 * interact with.
 *
 * Importantly: {@link RuleContext.addIssue}
 *
 * @packageDocumentation
 */

import {FAILED, OK} from '#constants';
import {type CheckOk, type Issue} from '#rule/issue';
import {type PackageJson} from '#schema/package-json';
import {type RuleSeverity} from '#schema/rule-severity';
import {type StaticRule} from '#schema/static-rule';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {asResult} from '#util/result';
import {serialize} from '#util/serialize';

import {RuleIssue} from './rule-issue';
import {type StaticRuleContext} from './static-rule-context';

/**
 * Unused within `midnight-smoker` proper, but can be helpful for hairy `Rule`
 * implementations.
 */
export type AddIssueFn = typeof RuleContext.prototype.addIssue;

/**
 * Options for {@link RuleContext.addIssue}
 */
export interface AddIssueOptions {
  /**
   * Arbitrary data. I'm not sure what this is for.
   */
  data?: unknown;

  /**
   * Path to the file where the issue was found.
   */
  filepath?: string | URL;

  /**
   * If the file is a JSON file, a keypath representing the location of issue.
   */
  jsonField?: string;
}

/**
 * A context object which is provided to a {@link RuleCheckFn}, containing
 * information about the current package to be checked and how to report a
 * failure.
 *
 * @public
 */
export class RuleContext implements StaticRuleContext {
  /**
   * List of any issues which were raised by the execution of this
   * {@link ruleId}.
   */
  private readonly _issues: RuleIssue[] = [];

  /**
   * The {@link StaticRuleContext} object which was provided to the constructor;
   * used for getters.
   */
  private readonly staticCtx: StaticRuleContext;

  public readonly staticRule: StaticRule;

  protected constructor(
    public readonly ruleId: string,
    staticRule: StaticRule,
    staticCtx: StaticRuleContext,
  ) {
    this.staticRule = staticRule;
    this.staticCtx = Object.freeze(serialize(staticCtx));
    // TODO: decorator
    this.addIssue = this.addIssue.bind(this);
  }

  /**
   * Creates a {@link RuleContext}.
   */
  public static create(
    staticRuleDef: StaticRule,
    staticCtx: StaticRuleContext,
    id: string,
  ): Readonly<RuleContext> {
    return Object.freeze(new RuleContext(id, staticRuleDef, staticCtx));
  }

  /**
   * Adds an issue to the list of issues for this context.
   *
   * This should be called by the {@link RuleCheckFn} when it detects a problem.
   *
   * @param message - Message for the issue
   * @param options - Options; see {@link AddIssueOptions}
   */
  public addIssue(
    message: string,
    {data, filepath, jsonField}: AddIssueOptions = {},
  ) {
    if (Object.isFrozen(this._issues)) {
      throw new Error('Cannot add issues to a finalized RuleContext');
    }
    this._issues.push(
      RuleIssue.create({
        ctx: serialize(this),
        data,
        filepath,
        jsonField,
        message,
        rule: this.staticRule,
      }),
    );
  }

  /**
   * Finalizes the rule context and returns a {@link FinalRuleContextResult}
   * object.
   *
   * After this is called, no issues can be added, and the `RuleContext`
   * shouldn't be mutated.
   *
   * @returns A {@link FinalRuleContextResult} object, discriminated on prop
   *   `type`.
   */
  public finalize(): FinalRuleContextResult {
    const issues = Object.freeze(this._issues);
    if (issues.length) {
      const checkRuleFailures = serialize<RuleIssue>([...issues]);
      return Object.freeze({
        result: Object.freeze(checkRuleFailures),
        type: FAILED,
      });
    }
    return Object.freeze({
      ctx: asResult(serialize(this)),
      rule: this.staticRule,
      type: OK,
    });
  }

  /**
   * Returns a {@link StaticRuleContext} object.
   *
   * @remarks
   * `RuleContext` _implements_ `StaticRuleContext`, but it isn't suitable for
   * serialization.
   * @returns A JSON-serializable representation of this object
   */
  public toJSON(): StaticRuleContext {
    return {...this.staticCtx};
  }

  /**
   * The absolute path to this context's package's root directory.
   *
   * This is the same as `path.dirname(pkgJsonPath)`
   */
  public get installPath(): string {
    return this.staticCtx.installPath;
  }

  /**
   * Gets a _copy_ of the list of issues.
   *
   * @returns An array of issues.
   */
  public get issues(): RuleIssue[] {
    return [...this._issues];
  }

  public get localPath(): string {
    return this.workspace.localPath;
  }

  /**
   * The normalized `package.json` for the package being checked.
   *
   * @returns The normalized `package.json` for the package being checked.
   */
  public get pkgJson(): PackageJson {
    return this.staticCtx.pkgJson;
  }

  /**
   * The absolute path to this context's package's `package.json`.
   */
  public get pkgJsonPath(): string {
    return this.staticCtx.pkgJsonPath;
  }

  public get pkgManager(): string {
    return this.staticCtx.pkgManager;
  }

  public get pkgName(): string {
    return this.staticCtx.pkgName;
  }

  public get rawPkgJson(): string {
    return this.staticCtx.rawPkgJson;
  }

  public get ruleName(): string {
    return this.staticRule.name;
  }

  /**
   * The severity level for this rule application (as chosen by the user)
   */
  public get severity(): RuleSeverity {
    return this.staticCtx.severity;
  }

  public get workspace(): WorkspaceInfo {
    return this.staticCtx.workspace;
  }
}

/**
 * The return type of {@link RuleContext.finalize}
 */
export type FinalRuleContextResult =
  | Readonly<{
      result: readonly Issue[];
      type: typeof FAILED;
    }>
  | Readonly<CheckOk>;
