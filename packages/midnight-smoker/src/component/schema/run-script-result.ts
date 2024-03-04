import {z} from 'zod';
import {ExecResultSchema} from './exec-result';
import {ScriptErrorSchema} from './script-error';

/**
 * Describes the result of running a custom script.
 *
 * The contents of this object describe whether the script failed (and how) or
 * not.
 */
export const RunScriptResultSchema = z
  .object({
    /**
     * The error if the script failed.
     */
    error: ScriptErrorSchema.optional().describe(
      'Error if abnormal failure (not a script failure)',
    ),

    /**
     * The raw result of running the script.
     */
    rawResult: ExecResultSchema.optional().describe(
      'Raw result of running the script',
    ),
  })
  .describe('The result of running a single custom script');

/**
 * {@inheritDoc zRunScriptResult}
 *
 * @see {@link zRunScriptResult}
 */

export type RunScriptResult = z.infer<typeof RunScriptResultSchema>;
