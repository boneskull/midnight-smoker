/**
 * Handles severity of rules
 * @packageDocumentation
 */

import {z} from 'zod';

export const CheckSeverities = {
  ERROR: 'error',
  WARN: 'warn',
  OFF: 'off',
} as const;

export const zCheckSeverity = z
  .enum([CheckSeverities.OFF, CheckSeverities.WARN, CheckSeverities.ERROR])
  .describe(
    'Severity of a rule. `off` disables the rule, `warn` will warn on violations, and `error` will error on violations.',
  )
  .default(CheckSeverities.ERROR);

export type CheckSeverity = z.infer<typeof zCheckSeverity>;
