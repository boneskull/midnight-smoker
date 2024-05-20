/**
 * Provides {@link RuleIssue}, which is how rule implementations report problems
 *
 * @packageDocumentation
 */

import {PACKAGE_JSON, RuleSeverities} from '#constants';
import type {RuleError} from '#error/rule-error';
import {type CheckResultFailed} from '#schema/check-result';
import {type StaticRuleContext, type StaticRuleDef} from '#schema/rule-static';
import {uniqueId, type UniqueId} from '#util/unique-id';
import {serialize} from '#util/util';
import path from 'node:path';
import {fileURLToPath} from 'url';

/**
 * Properties for a {@link RuleIssue}.
 *
 * Accepted by {@link RuleIssue.create}
 */
export interface RuleIssueParams<
  Ctx extends StaticRuleContext,
  RuleDef extends StaticRuleDef,
> {
  /**
   * The {@link StaticRuleContext} for this issue, for public consumption.
   */
  ctx: Ctx;

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
  rule: RuleDef;

  filepath?: string | URL;
}

/**
 * An issue raised by a {@link RuleCheckFn}
 */
export class RuleIssue implements CheckResultFailed {
  public readonly type = 'FAILED';

  /**
   * {@inheritDoc RuleIssueParams.ctx}
   */
  public readonly ctx: StaticRuleContext;

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
  }: RuleIssueParams<StaticRuleContext, StaticRuleDef>) {
    this.rule = rule;
    this.ctx = ctx;
    this.message = message;
    this.data = data;
    this.error = error;
    this.id = uniqueId({prefix: 'issue'});
    this.filepath =
      filepath instanceof URL
        ? fileURLToPath(filepath)
        : filepath
          ? filepath
          : path.join(ctx.localPath, PACKAGE_JSON);
  }

  public get pkgManager() {
    return this.ctx.pkgManager;
  }

  /**
   * This will be `true` if {@link severity} is {@link RuleSeverities.Error}.
   */
  public get failed() {
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
   * @template Ctx
   * @template RuleDef
   * @param params - _Required_ parameters
   * @returns A new readonly {@link RuleIssue}
   */
  public static create<
    Ctx extends StaticRuleContext,
    RuleDef extends StaticRuleDef,
  >(params: RuleIssueParams<Ctx, RuleDef>): Readonly<RuleIssue> {
    return Object.freeze(new RuleIssue(params));
  }

  /**
   * Converts the {@link RuleIssue} object to a JSON representation.
   *
   * @returns The JSON representation of the {@link RuleIssue} object.
   */
  public toJSON(): CheckResultFailed {
    const {rule, ctx, message, data, error, id, failed, filepath} = this;
    return {
      type: 'FAILED',
      rule,
      ctx,
      message,
      data: serialize(data),
      error,
      id,
      failed,
      filepath,
    };
  }

  /**
   * A `compareFn` for {@link Array.sort}
   *
   * @param a - A {@link RuleIssue}
   * @param b - Another {@link RuleIssue}
   * @returns A number where, if positive, means that `a` should come after `b`.
   *   If negative then the opposite. If 0, then they are equal.
   */
  public static compare(
    this: void,
    a: CheckResultFailed,
    b: CheckResultFailed,
  ): number {
    return a.id.localeCompare(b.id, 'en');
  }
}
