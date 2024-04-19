import {RuleResultFailedSchema, RuleResultOkSchema} from '#schema/rule-result';
import {z} from 'zod';

export const LintResultSchema = z
  .object({
    issues: z
      .array(RuleResultFailedSchema)
      .describe('Flattened array of issues found in rules'),
    passed: z
      .array(RuleResultOkSchema)
      .describe(
        'Flattened array of results from rules which passed without issue',
      ),
  })
  .describe('Results for a set of executed rules');

/**
 * The result of executing a single {@link Rule}.
 */
export type LintResult = z.infer<typeof LintResultSchema>;
