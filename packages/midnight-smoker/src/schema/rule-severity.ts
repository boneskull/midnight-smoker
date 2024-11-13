/**
 * Rule severities!
 *
 * @packageDocumentation
 */

import {RuleSeverities} from '#constants';
import {z} from 'zod';

/**
 * Schema for {@link RuleSeverities}
 */
export const RuleSeveritySchema: z.ZodNativeEnum<typeof RuleSeverities> = z
  .nativeEnum(RuleSeverities)
  .describe(
    'Severity of a rule. `off` disables the rule, `warn` will warn on violations, and `error` will error (non-zero exit code) on violations.',
  );

/**
 * One of the allowed rule severity levels.
 */
export type RuleSeverity = (typeof RuleSeverities)[keyof typeof RuleSeverities];
