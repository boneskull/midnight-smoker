import {RuleIssueSchema} from '#schema/rule-issue';
import {RuleOkSchema} from '#schema/rule-result';
import {z} from 'zod';

export const RunRulesResultSchema = z
  .object({
    issues: z
      .array(RuleIssueSchema)
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
export type RunRulesResult = z.infer<typeof RunRulesResultSchema>;
