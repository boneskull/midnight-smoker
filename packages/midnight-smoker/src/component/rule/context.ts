import {PackageJson} from 'type-fest';
import {serialize} from '../../util';
import {RuleIssue} from './issue';
import type {StaticRule, StaticRuleContext} from './static';

/**
 * The `addIssue` function that a {@linkcode RuleCheckFn} uses to create a
 * {@linkcode RuleIssue}. The {@linkcode RuleCheckFn} then returns an array of
 * these.
 *
 * Member of a {@linkcode RuleContext}.
 */
export type AddIssueFn = (message: string, data?: unknown) => void;

/**
 * A context object which is provided to a {@linkcode RuleCheckFn}, containing
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
   * List of any issues which were raised by the execution of this {@link rule}.
   */
  readonly #issues: RuleIssue[] = [];
  protected constructor(
    private readonly rule: StaticRule,
    staticCtx: StaticRuleContext,
  ) {
    this.staticCtx = Object.freeze({...staticCtx});
    this.addIssue = this.addIssue.bind(this);
    this.addIssueFromError = this.addIssueFromError.bind(this);
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
  public get pkgPath() {
    return this.staticCtx.pkgPath;
  }

  /**
   * The severity level for this rule application (as chosen by the user)
   */
  public get severity() {
    return this.staticCtx.severity;
  }

  /**
   * Creates a {@link RuleContext}.
   */
  public static create(
    rule: StaticRule,
    staticCtx: StaticRuleContext,
  ): Readonly<RuleContext> {
    return Object.freeze(new RuleContext(rule, serialize(staticCtx)));
  }

  /**
   * This should be used when a {@link RuleCheckFn} throws or rejects.
   *
   * Under normal operation, this shouldn't happen.
   *
   * @param err - Error to add as an issue
   */
  public addIssueFromError(err: Error): void {
    this.#addIssue(
      RuleIssue.create({
        message: `${err.message}\n\n${err.stack}`,
        error: err,
        rule: serialize(this.rule),
        context: serialize(this),
      }),
    );
  }

  /**
   * Adds an issue to the list of issues for this context.
   *
   * This should be called by the {@link RuleCheckFn} when it detects a problem.
   *
   * @param message - Message for the issue
   * @param data - Additional data to include in the issue
   */
  public addIssue: AddIssueFn = function (this: RuleContext, message, data) {
    this.#addIssue(
      RuleIssue.create({
        message,
        data,
        rule: serialize(this.rule),
        context: serialize(this),
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
   * Omits the {@linkcode RuleContext.pkgJson} property (too big).
   *
   * @returns A JSON-serializable representation of this object
   */
  public toJSON(): StaticRuleContext {
    return {...this.staticCtx};
  }
}
