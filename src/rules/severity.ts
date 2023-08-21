import {z} from 'zod';

export const RuleSeverities = {
  ERROR: 'error',
  WARN: 'warn',
  OFF: 'off',
} as const;

export const RuleSeveritySchema = z
  .enum([RuleSeverities.OFF, RuleSeverities.WARN, RuleSeverities.ERROR])
  .describe(
    'Severity of a rule. `off` disables the rule, `warn` will warn on violations, and `error` will error on violations.',
  );
