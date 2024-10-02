/**
 * Provides {@link RuleIssue}, which is kind of like a _lint error_.
 *
 * `Reporter`s receive `RuleIssue`s, and can call
 * {@link RuleIssue.getSourceContext}.
 *
 * @packageDocumentation
 */
import {FAILED, PACKAGE_JSON, RuleSeverities} from '#constants';
import {type RuleError} from '#error/rule-error';
import {type Issue} from '#rule/issue';
import {type StaticRule} from '#schema/static-rule';
import {NL} from '#util/format';
import {asResult, type Result} from '#util/result';
import {serialize} from '#util/serialize';
import {uniqueId, type UniqueId} from '#util/unique-id';
import path from 'node:path';
import {fileURLToPath} from 'url';

import {JSONBlamer} from './json-blamer';
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

  jsonField?: string;

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
export class RuleIssue implements Issue {
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

  public readonly jsonField?: string;

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
    jsonField,
    message,
    rule,
  }: RuleIssueParams) {
    // just in case StaticRuleDef is a Rule
    this.rule = serialize(rule);
    this.ctx = asResult(ctx);
    this.data = data;
    this.error = error;
    this.id = uniqueId({prefix: 'issue'});
    this.jsonField = jsonField;
    this.filepath =
      filepath instanceof URL
        ? fileURLToPath(filepath)
        : filepath
          ? filepath
          : path.join(ctx.workspace.localPath, PACKAGE_JSON);

    this.message = message;
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
   * Given a workspace, JSON filepath (absolute or relative to the workspace's
   * `localPath`), and a JSON field keypath, return a string which contains the
   * context (previous lines) in the source file (with line numbers),
   * highlighting the problem field.
   *
   * @param result Failed check result
   * @returns A string pointing to the source of the issue
   */
  public static getSourceContext(result: Issue) {
    const {
      ctx: {rawPkgJson},
      filepath,
      jsonField,
    } = result;
    if (filepath && path.extname(filepath) === '.json' && jsonField) {
      const blamer = new JSONBlamer(rawPkgJson, filepath);
      const res = blamer.find(jsonField);
      if (res) {
        const context = blamer.getContext(res);
        return `${context}${NL}`;
      }
      return '';
    } else {
      return '';
    }
  }

  /**
   * Converts the {@link RuleIssue} object to a JSON representation.
   *
   * @returns The JSON representation of the {@link RuleIssue} object.
   */
  public toJSON(): Issue {
    const {ctx, data, error, filepath, id, isError, jsonField, message, rule} =
      this;
    return {
      ctx,
      data: serialize(data),
      error,
      filepath,
      id,
      isError,
      jsonField,
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
