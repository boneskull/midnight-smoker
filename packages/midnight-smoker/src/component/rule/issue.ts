/**
 * Provides {@link RuleIssue}, which is how rule implementations report problems
 *
 * @packageDocumentation
 */

import {z} from 'zod';
import {RuleError} from '../../error/rule-error';
import {instanceofSchema, zNonEmptyString} from '../../schema-util';
import {uniqueIdFactoryFactory} from '../../util';
import {RuleSeverities, zRuleSeverity} from './severity';
import {
  StaticRule,
  StaticRuleContext,
  zStaticRule,
  zStaticRuleContext,
} from './static';

/**
 * Properties for a {@link RuleIssue}.
 *
 * Accepted by {@link RuleIssue.create}
 */
export interface RuleIssueParams<
  Ctx extends StaticRuleContext,
  RuleDef extends StaticRule,
> {
  /**
   * The {@link StaticRuleContext} for this issue, for public consumption.
   */
  context: Ctx;
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
}

/**
 * An issue raised by a {@link RuleCheckFn}
 */
export class RuleIssue implements StaticRuleIssue {
  /**
   * Generates a unique ID for each issue
   *
   * @internal
   */
  protected static generateId = uniqueIdFactoryFactory('issue-');

  /**
   * {@inheritDoc RuleIssueParams.context}
   */
  public readonly context: StaticRuleContext;
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
  public readonly id: string;
  /**
   * {@inheritDoc RuleIssueParams.message}
   */
  public readonly message: string;
  /**
   * {@inheritDoc RuleIssueParams.rule}
   */
  public readonly rule: StaticRule;

  public constructor({
    rule,
    context,
    message,
    data,
    error,
  }: RuleIssueParams<StaticRuleContext, StaticRule>) {
    this.rule = rule;
    this.context = context;
    this.message = message;
    this.data = data;
    this.error = error;
    this.id = RuleIssue.generateId();
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
    return this.context.severity;
  }

  /**
   * Creates a new readonly {@link RuleIssue}.
   *
   * @template Ctx - _Exact_ `StaticRuleContext`; _not_ a `RuleContext`
   * @template RuleDef - _Exact_ `SomeStaticRuleDef`; _not_ a `StaticRuleDef`
   * @param params - _Required_ parameters
   * @returns A new readonly {@link RuleIssue}
   */
  public static create<
    Ctx extends StaticRuleContext,
    RuleDef extends StaticRule,
  >(params: RuleIssueParams<Ctx, RuleDef>): Readonly<RuleIssue> {
    return Object.freeze(
      new RuleIssue(params as RuleIssueParams<StaticRuleContext, StaticRule>),
    );
  }

  /**
   * Converts the {@link RuleIssue} object to a JSON representation.
   *
   * @returns The JSON representation of the {@link RuleIssue} object.
   */
  public toJSON(): StaticRuleIssue {
    const {rule, context, message, data, error, id, failed, severity} = this;
    return {
      rule,
      context,
      message,
      data,
      error,
      id,
      failed,
      severity,
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
    a: StaticRuleIssue,
    b: StaticRuleIssue,
  ): number {
    return a.id.localeCompare(b.id, 'en');
  }
}

/**
 * Schema for a {@link StaticRuleIssue}, which is a {@link RuleIssue} in a
 * serializable format
 */
export const zStaticRuleIssue = z.object({
  rule: zStaticRule,
  context: zStaticRuleContext,
  message: zNonEmptyString.describe(
    'The human-=readable message for this issue',
  ),
  data: z.unknown().optional().describe('Arbitrary data attached to the issue'),
  error: instanceofSchema(Error).optional().describe('An error, if any'),
  id: zNonEmptyString.describe('A unique identifier for this issue'),
  failed: z.boolean().describe('Whether or not this issue is a failure'),
  severity: zRuleSeverity.describe('The severity that this rule was run at'),
});

/**
 * Represents a static rule issue, which is a {@link RuleIssue} in a serializable
 * format
 */
export type StaticRuleIssue = z.infer<typeof zStaticRuleIssue>;

/**
 * Schema for a {@link RuleIssue}
 */
export const zRuleIssue = instanceofSchema(RuleIssue);