import {fromUnknownError} from '#error/from-unknown-error';
import {RuleError} from '#error/rule-error';
import {type StaticRuleContext, type StaticRuleDef} from '#schema/rule-static';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {serialize} from '#util/util';
import {type PackageJson} from 'type-fest';
import {RuleIssue} from './issue';

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
    ruleDef: SomeRuleDef,
    staticCtx: StaticRuleContext,
  ) {
    this.staticRuleDef = serialize(ruleDef);
    this.staticCtx = Object.freeze(serialize(staticCtx));
    this.addIssue = this.addIssue.bind(this);
    this.addIssueFromError = this.addIssueFromError.bind(this);
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

  /**
   * Gets a _copy_ of the list of issues.
   *
   * @returns An array of issues.
   */
  public get issues() {
    return [...this.#issues];
  }

  public get localPath(): string {
    return this.staticCtx.localPath;
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
    ruleDef: SomeRuleDef,
    staticCtx: StaticRuleContext,
    id: string,
  ): Readonly<RuleContext> {
    return Object.freeze(new RuleContext(id, ruleDef, staticCtx));
  }

  /**
   * This should be used when a {@link RuleCheckFn} throws or rejects.
   *
   * Under normal operation, this shouldn't happen.
   *
   * @param err - Error to add as an issue
   */
  public addIssueFromError(err: unknown): void {
    const error = new RuleError(
      `Rule "${this.ruleId}" threw an exception`,
      this.toJSON(),
      this.ruleId,
      fromUnknownError(err),
    );

    const {message} = error;
    const ctx = serialize(this);

    this.#addIssue(
      RuleIssue.create({
        message,
        error,
        rule: this.staticRuleDef,
        ctx,
      }),
    );
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
   * Finalizes the rule context and returns the collected issues.
   *
   * @returns An array of {@link RuleIssue} objects or `undefined` if no issues
   *   were collected.
   * @todo This is currently called by the RuleRunner, but it should be called
   *   by something else instead. a RuleRunnerController?
   */
  public finalize(): readonly RuleIssue[] | undefined {
    const issues = Object.freeze(this.#issues);
    if (issues.length) {
      return issues;
    }
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
