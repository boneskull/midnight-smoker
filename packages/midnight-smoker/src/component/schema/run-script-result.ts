import {z} from 'zod';
import {ExecResultSchema} from './exec-result';
import {ScriptErrorSchema} from './script-error';

/**
 * The error if the script failed.
 */
export const ScriptResultErrorSchema = ScriptErrorSchema.describe(
  'Error if abnormal failure (not a script failure)',
);

/**
 * The raw result of running the script.
 */
export const ScriptResultRawResultSchema = ExecResultSchema.describe(
  'Raw result of running the script',
);

/**
 * Describes the result of running a custom script.
 *
 * The contents of this object describe whether the script failed (and how) or
 * not.
 */
export const RunScriptResultSchema = z
  .object({
    rawResult: ScriptResultRawResultSchema.optional(),
    skipped: z.boolean().optional(),
    error: ScriptResultErrorSchema.optional(),
  })
  .describe('The result of running a single custom script');

/**
 * {@inheritDoc RunScriptResultSchema}
 */

export type RunScriptResult = z.infer<typeof RunScriptResultSchema>;
