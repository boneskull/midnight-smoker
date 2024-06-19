import {type CheckFailed, type CheckOk} from '#schema/check-result';
import {
  StaticRuleDefSchema,
  type StaticRuleContext,
  type StaticRuleDef,
} from '#schema/rule-static';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {asResult} from '#util/result';
import {serialize} from '#util/serialize';
import {type PackageJson} from 'type-fest';
import {RuleIssue} from './rule-issue';

export interface AddIssueOptions {
  filepath?: string | URL;
  data?: unknown;
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
   * The {@link StaticRuleContext} object which was provided to the constructor;
   * used for getters.
   */
  private readonly staticCtx: Readonly<StaticRuleContext>;

  /**
   * List of any issues which were raised by the execution of this
   * {@link ruleId}.
   */
  readonly #issues: RuleIssue[] = [];

  public readonly staticRuleDef: StaticRuleDef;

  protected constructor(
    public readonly ruleId: string,
    staticRuleDef: StaticRuleDef,
    staticCtx: StaticRuleContext,
  ) {
    this.staticRuleDef = staticRuleDef;
    this.staticCtx = Object.freeze(serialize(staticCtx));
    // TODO: decorator
    this.addIssue = this.addIssue.bind(this);
  }

  public get ruleName(): string {
    return this.staticRuleDef.name;
  }

  /**
   * The parsed `package.json` for the package being checked.
   *
   * _Not_ normalized.
   *
   * @returns The parsed `package.json` for the package being checked.
   */
  public get pkgJson(): PackageJson {
    return this.staticCtx.pkgJson;
  }

  public get workspace(): WorkspaceInfo {
    return this.staticCtx.workspace;
  }

  /**
   * Gets a _copy_ of the list of issues.
   *
   * @returns An array of issues.
   */
  public get issues() {
    return [...this.#issues];
  }

  public get localPath(): string {
    return this.workspace.localPath;
  }

  /**
   * The absolute path to this context's package's `package.json`.
   */
  public get pkgJsonPath() {
    return this.staticCtx.pkgJsonPath;
  }

  /**
   * The absolute path to this context's package's root directory.
   *
   * This is the same as `path.dirname(pkgJsonPath)`
   */
  public get installPath() {
    return this.staticCtx.installPath;
  }

  /**
   * The severity level for this rule application (as chosen by the user)
   */
  public get severity() {
    return this.staticCtx.severity;
  }

  public get pkgName() {
    return this.staticCtx.pkgName;
  }

  public get pkgManager() {
    return this.staticCtx.pkgManager;
  }

  /**
   * Creates a {@link RuleContext}.
   */
  public static create(
    staticRuleDef: StaticRuleDef,
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
        message,
        data,
        rule: this.staticRuleDef,
        ctx: serialize(this),
        filepath,
      }),
    );
  };

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
   * @returns A {@link FinalizedRuleContextResult} object, discriminated on prop
   *   `type`.
   */
  public finalize(): FinalizedRuleContextResult {
    const issues = Object.freeze(this.#issues);
    if (issues.length) {
      const checkRuleFailures = serialize<RuleIssue>([...issues]);
      return Object.freeze({
        type: 'FAILED',
        result: Object.freeze(checkRuleFailures),
      });
    }
    return Object.freeze({
      type: 'OK',
      rule: StaticRuleDefSchema.parse(this.staticRuleDef),
      ctx: asResult(serialize(this)),
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
}

/**
 * The return type of {@link RuleContext.finalize}
 */
export type FinalizedRuleContextResult =
  | Readonly<CheckOk>
  | Readonly<{
      type: 'FAILED';
      result: readonly CheckFailed[];
    }>;
