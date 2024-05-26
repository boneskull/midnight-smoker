import {ERROR, FAILED, OK, SKIPPED} from '#constants';
import {RunScriptError} from '#error/run-script-error';
import {ScriptFailedError} from '#error/script-failed-error';
import {UnknownScriptError} from '#error/unknown-script-error';
import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';
import {ExecResultSchema} from './exec-result';
import {ScriptErrorSchema} from './script-error';

export type RunScriptErrorResult = z.infer<typeof RunScriptErrorResultSchema>;

export type RunScriptFailedResult = z.infer<typeof RunScriptFailedResultSchema>;

export type RunScriptOkResult = z.infer<typeof RunScriptOkResultSchema>;

export type RunScriptSkippedResult = z.infer<
  typeof RunScriptSkippedResultSchema
>;

/**
 * {@inheritDoc RunScriptResultSchema}
 */
export type RunScriptResult = z.infer<typeof RunScriptResultSchema>;

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

export const RunScriptErrorResultSchema = z.object({
  type: z.literal(ERROR),
  error: z.union([
    instanceofSchema(RunScriptError),
    instanceofSchema(UnknownScriptError),
  ]),
  rawResult: ScriptResultRawResultSchema.optional(),
});

export const RunScriptSkippedResultSchema = z.object({
  type: z.literal(SKIPPED),
});

export const RunScriptOkResultSchema = z.object({
  type: z.literal(OK),
  rawResult: ScriptResultRawResultSchema,
});

export const RunScriptFailedResultSchema = z.object({
  type: z.literal(FAILED),
  rawResult: ScriptResultRawResultSchema,
  error: instanceofSchema(ScriptFailedError),
});

/**
 * Describes the result of running a custom script.
 *
 * The contents of this object describe whether the script failed (and how) or
 * not.
 */
export const RunScriptResultSchema = z
  .discriminatedUnion('type', [
    RunScriptOkResultSchema,
    RunScriptSkippedResultSchema,
    RunScriptErrorResultSchema,
    RunScriptFailedResultSchema,
  ])
  .describe('The result of running a single custom script');
