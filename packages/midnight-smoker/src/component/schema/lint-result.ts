import {StaticRuleIssueSchema} from '#schema';
import {RuleOkSchema} from '#schema/rule-result';
import {z} from 'zod';

export const LintResultSchema = z
  .object({
    issues: z
      .array(StaticRuleIssueSchema)
      .describe('Flattened array of issues found in rules'),
    passed: z
      .array(RuleOkSchema)
      .describe(
        'Flattened array of results from rules which passed without issue',
      ),
  })
  .describe('Results for _all_ executed rules');

/**
 * The result of executing a single {@link Rule}.
 */
export type LintResult = z.infer<typeof LintResultSchema>;
