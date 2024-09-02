/**
 * Provides {@link RuleIssue}, which is how rule implementations report problems
 *
 * @packageDocumentation
 */
import {FAILED, PACKAGE_JSON, RuleSeverities} from '#constants';
import {type RuleError} from '#error/rule-error';
import {type CheckResultFailed} from '#rule/check-result';
import {type StaticRule} from '#schema/static-rule';
import {asResult, type Result} from '#util/result';
import {serialize} from '#util/serialize';
import {uniqueId, type UniqueId} from '#util/unique-id';
import path from 'node:path';
import {fileURLToPath} from 'url';

import {type StaticRuleContext} from './static-rule-context';

/**
 * Properties for a {@link RuleIssue}.
 *
 * Accepted by {@link RuleIssue.create}
 */
export interface RuleIssueParams {
  /**
   * The {@link StaticRuleContext} for this issue, for public consumption.
   */
  ctx: StaticRuleContext;

  /**
   * Arbitrary data attached to the issue by the rule implementation
   */
  data?: unknown;

  /**
   * A {@link RuleError} which was caught during the execution of the rule, if
   * any
   */
  error?: RuleError;

  /**
   * Filepath to the problem file. Defaults to `package.json`
   */
  filepath?: string | URL;

  /**
   * The message for this issue
   */
  message: string;

  /**
   * The serialized rule definition for this issue
   */
  rule: StaticRule;
}

/**
 * An issue raised by a {@link RuleCheckFn}
 */
export class RuleIssue implements CheckResultFailed {
  /**
   * {@inheritDoc RuleIssueParams.ctx}
   */
  public readonly ctx: Result<StaticRuleContext>;

  /**
   * {@inheritDoc RuleIssueParams.data}
   */
  public readonly data?: unknown;

  /**
   * {@inheritDoc RuleIssueParams.error}
   */
  public readonly error?: RuleError;

  public readonly filepath: string;

  /**
   * Unique identifier; created within constructor
   */
  public readonly id: UniqueId<'issue'>;

  /**
   * {@inheritDoc RuleIssueParams.message}
   */
  public readonly message: string;

  /**
   * {@inheritDoc RuleIssueParams.rule}
   */
  public readonly rule: StaticRule;

  public readonly type = FAILED;

  public constructor({
    ctx,
    data,
    error,
    filepath,
    message,
    rule,
  }: RuleIssueParams) {
    // just in case StaticRuleDef is a Rule
    this.rule = serialize(rule);
    this.ctx = asResult(ctx);
    this.message = message;
    this.data = data;
    this.error = error;
    this.id = uniqueId({prefix: 'issue'});
    this.filepath =
      filepath instanceof URL
        ? fileURLToPath(filepath)
        : filepath
          ? filepath
          : path.join(ctx.workspace.localPath, PACKAGE_JSON);
  }

  /**
   * Creates a new readonly {@link RuleIssue}.
   *
   * @param params - _Required_ parameters
   * @returns A new readonly {@link RuleIssue}
   */
  public static create(params: RuleIssueParams): Readonly<RuleIssue> {
    return Object.freeze(new RuleIssue(params));
  }

  /**
   * Converts the {@link RuleIssue} object to a JSON representation.
   *
   * @returns The JSON representation of the {@link RuleIssue} object.
   */
  public toJSON(): CheckResultFailed {
    const {ctx, data, error, filepath, id, isError, message, rule} = this;
    return {
      ctx,
      data: serialize(data),
      error,
      filepath,
      id,
      isError,
      message,
      rule,
      type: FAILED,
    };
  }

  /**
   * This will be `true` if {@link severity} is {@link RuleSeverities.Error}.
   */
  public get isError() {
    return this.severity === RuleSeverities.Error;
  }

  /**
   * The severity of this issue, configured by the end user
   */
  public get severity() {
    return this.ctx.severity;
  }
}
