import {FAILED, OK} from '#constants';
import {type CheckResultFailed, type CheckResultOk} from '#rule/check-result';
import {type NormalizedPackageJson} from '#schema/package-json';
import {type RuleSeverity} from '#schema/rule-severity';
import {type StaticRule} from '#schema/static-rule';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {asResult} from '#util/result';
import {serialize} from '#util/serialize';

import {RuleIssue} from './rule-issue';
import {type StaticRuleContext} from './static-rule-context';

export interface AddIssueOptions {
  data?: unknown;
  filepath?: string | URL;
}

/**
 * The `addIssue` function that a {@link RuleCheckFn} uses to create a
 * {@link RuleIssue}. The {@link RuleCheckFn} then returns an array of these.
 *
 * Member of a {@link RuleContext}.
 */
export type AddIssueFn = (message: string, opts?: AddIssueOptions) => void;

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
  readonly #issues: RuleIssue[] = [];

  /**
   * The {@link StaticRuleContext} object which was provided to the constructor;
   * used for getters.
   */
  private readonly staticCtx: StaticRuleContext;

  /**
   * Adds an issue to the list of issues for this context.
   *
   * This should be called by the {@link RuleCheckFn} when it detects a problem.
   *
   * @param message - Message for the issue
   * @param filepath - Filepath where the issue was found
   * @param data - Additional data to include in the issue
   */
  public addIssue: AddIssueFn = function (
    this: RuleContext,
    message,
    {data, filepath} = {},
  ) {
    this.#addIssue(
      RuleIssue.create({
        ctx: serialize(this),
        data,
        filepath,
        message,
        rule: this.staticRuleDef,
      }),
    );
  };

  public readonly staticRuleDef: StaticRule;

  protected constructor(
    public readonly ruleId: string,
    staticRuleDef: StaticRule,
    staticCtx: StaticRuleContext,
  ) {
    this.staticRuleDef = staticRuleDef;
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
   * Adds a RuleIssue to the list of issues.
   *
   * @param issue The RuleIssue to add.
   */
  #addIssue(issue: RuleIssue): void {
    this.#issues.push(issue);
  }

  /**
   * Finalizes the rule context and returns a result object.
   *
   * @returns A {@link FinalRuleContextResult} object, discriminated on prop
   *   `type`.
   */
  public finalize(): FinalRuleContextResult {
    const issues = Object.freeze(this.#issues);
    if (issues.length) {
      const checkRuleFailures = serialize<RuleIssue>([...issues]);
      return Object.freeze({
        result: Object.freeze(checkRuleFailures),
        type: FAILED,
      });
    }
    return Object.freeze({
      ctx: asResult(serialize(this)),
      rule: this.staticRuleDef,
      type: OK,
    });
  }

  /**
   * Omits the {@link RuleContext.pkgJson} property (too big).
   *
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
    return [...this.#issues];
  }

  public get localPath(): string {
    return this.workspace.localPath;
  }

  /**
   * The parsed `package.json` for the package being checked.
   *
   * _Not_ normalized.
   *
   * @returns The parsed `package.json` for the package being checked.
   */
  public get pkgJson(): NormalizedPackageJson {
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

  public get ruleName(): string {
    return this.staticRuleDef.name;
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
      result: readonly CheckResultFailed[];
      type: typeof FAILED;
    }>
  | Readonly<CheckResultOk>;
