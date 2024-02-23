import {z} from 'zod';
import {NonEmptyStringSchema} from '../../util/schema-util';
import {ExecErrorSchema, ExecResultSchema} from './exec-result';
import {zScriptError} from './script-error';

/**
 * Describes the result of running a custom script.
 *
 * The contents of this object describe whether the script failed (and how) or
 * not.
 */
export const RunScriptResultSchema = z
  .object({
    /**
     * The directory in which the script ran.
     */
    cwd: NonEmptyStringSchema.optional().describe(
      'Directory in which the script ran',
    ),

    /**
     * The error if the script failed.
     */
    error: zScriptError
      .optional()
      .describe('Error if abnormal failure (not a script failure)'),

    /**
     * The name of the package in which the script ran.
     */
    pkgName: NonEmptyStringSchema.describe(
      'Name of the package in which the script ran',
    ),

    /**
     * The raw result of running the script.
     */
    rawResult: z
      .union([ExecResultSchema, ExecErrorSchema])
      .describe('Raw result of running the script'),

    /**
     * The name of the script that ran.
     */
    script: NonEmptyStringSchema.describe('Name of script'),

    /**
     * Whether the script was skipped.
     */
    skipped: z.boolean().optional().describe('Whether the script was skipped'),
  })
  .describe('The result of running a single custom script');

/**
 * {@inheritDoc zRunScriptResult}
 *
 * @see {@link zRunScriptResult}
 */

export type RunScriptResult = z.infer<typeof RunScriptResultSchema>;
