/**
 * Rule severities!
 *
 * @packageDocumentation
 */

import {z} from 'zod';

/**
 * Enum-like object for severity levels a rule can be set to.
 */
export const RuleSeverities = {
  Error: 'error',
  Warn: 'warn',
  Off: 'off',
} as const;

/**
 * Default severity level of all rules.
 */
export const DEFAULT_RULE_SEVERITY = RuleSeverities.Error;

/**
 * Schema for {@link RuleSeverities}
 */
export const zRuleSeverity = z
  .nativeEnum(RuleSeverities)
  .describe(
    'Severity of a rule. `off` disables the rule, `warn` will warn on violations, and `error` will error (non-zero exit code) on violations.',
  );

/**
 * One of the allowed rule severity levels.
 */
export type RuleSeverity = z.infer<typeof zRuleSeverity>;
