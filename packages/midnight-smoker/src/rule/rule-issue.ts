/**
 * Provides {@link RuleIssue}, which is how rule implementations report problems
 *
 * @packageDocumentation
 */
import {PACKAGE_JSON, RuleSeverities} from '#constants';
import type {RuleError} from '#error/rule-error';
import {type CheckFailed} from '#schema/check-result';
import {
  StaticRuleDefSchema,
  type StaticRuleContext,
  type StaticRuleDef,
} from '#schema/rule-static';
import {asResult, type Result} from '#util/result';
import {uniqueId, type UniqueId} from '#util/unique-id';
import path from 'node:path';
import {fileURLToPath} from 'url';
import {serialize} from '../util/serialize';

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
   * The message for this issue
   */
  message: string;

  /**
   * The serialized rule definition for this issue
   */
  rule: StaticRuleDef;

  filepath?: string | URL;
}

/**
 * An issue raised by a {@link RuleCheckFn}
 */
export class RuleIssue implements CheckFailed {
  public readonly type = 'FAILED';

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

  /**
   * Unique identifier; created within constructor
   */
  public readonly id: UniqueId;

  /**
   * {@inheritDoc RuleIssueParams.message}
   */
  public readonly message: string;

  /**
   * {@inheritDoc RuleIssueParams.rule}
   */
  public readonly rule: StaticRuleDef;

  public readonly filepath: string;

  public constructor({
    rule,
    ctx,
    message,
    data,
    error,
    filepath,
  }: RuleIssueParams) {
    this.rule = StaticRuleDefSchema.parse(rule);
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
  public toJSON(): CheckFailed {
    const {rule, ctx, message, data, error, id, isError, filepath} = this;
    return {
      type: 'FAILED',
      rule,
      ctx,
      message,
      data: serialize(data),
      error,
      id,
      isError,
      filepath,
    };
  }
}
