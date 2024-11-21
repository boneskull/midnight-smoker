/**
 * Defines a {@link Rule}, which is a component a plugin may provide.
 *
 * Rules are kind of like ESLint rules, but they do not operate on an AST. They
 * are given free reign to do what they please within an installed package
 * artifact. Useful information is provided via the {@link RuleContext} object,
 * and some rules may not need much more than this to operate.
 *
 * Rules run against the installed package artifact of the configured
 * workspac(es). Generally, this will be the same for any given package manager,
 * but there may be exceptions. If there _are_ exceptions, it's our hope to
 * detect them.
 *
 * @module midnight-smoker/defs/rule
 */

import {type RuleContext} from '#rule/rule-context';
import {type RuleOptions} from '#schema/lint/rule-options';
import {type RuleSchemaValue} from '#schema/lint/rule-schema-value';
import {type StaticRule} from '#schema/lint/static-rule';

export type {RuleSchemaValue};

/**
 * The {@link Rule.check} prop; the function which actually performs the check
 * within a {@link Rule}.
 *
 * @public
 */
export type RuleCheckFn<Schema extends RuleSchemaValue | void = void> = (
  this: void,
  ctx: Readonly<RuleContext>,
  opts: RuleOptions<Schema>,
  signal?: AbortSignal,
) => Promise<void> | void;

/**
 * A {@link Rule} suitable for serialization to JSON or sharing amongst plugins.
 */
export type {StaticRule};

/**
 * Some `Rule`, suitable for use in collections
 *
 * @private
 */
export type SomeRule = Rule<RuleSchemaValue | void>;

/**
 * The raw definition of a `Rule`, as defined by a plugin
 *
 * @public
 */
export interface Rule<Schema extends RuleSchemaValue | void = void>
  extends StaticRule {
  /**
   * Any additional properties that the rule may define.
   *
   * Note that the {@link check} method does not run in the context of the
   * {@link Rule} object and cannot access propeties via `this`.
   */
  [x: string]: unknown;

  /**
   * The function which actually performs the check.
   *
   * This function will receive a {@link RuleContext} object and will call its
   * {@link RuleContext.addIssue addIssue} method to report any issues it finds.
   */
  check: RuleCheckFn<Schema>;

  /**
   * A Zod schema representing the options for this `Rule`, if any
   */
  schema?: Schema;
}
