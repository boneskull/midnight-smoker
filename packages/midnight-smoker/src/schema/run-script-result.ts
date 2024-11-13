import {ERROR, FAILED, OK, SKIPPED} from '#constants';
import {RunScriptError} from '#error/run-script-error';
import {ScriptFailedError} from '#error/script-failed-error';
import {UnknownScriptError} from '#error/unknown-script-error';
import {asResultSchema} from '#util/result';
import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';

import {ExecOutputSchema} from './exec-output';
import {RunScriptManifestSchema} from './run-script-manifest';
import {ScriptErrorSchema} from './script-error';

export type RunScriptResultError = z.infer<typeof RunScriptErrorResultSchema>;

export type RunScriptResultFailed = z.infer<typeof RunScriptFailedResultSchema>;

export type RunScriptResultOk = z.infer<typeof RunScriptOkResultSchema>;

export type RunScriptResultSkipped = z.infer<
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
export const ScriptResultRawResultSchema = ExecOutputSchema.describe(
  'Raw result of running the script',
);

export const BaseRunScriptResultSchema = z.strictObject({
  manifest: asResultSchema(RunScriptManifestSchema),
});

export const RunScriptErrorResultSchema = BaseRunScriptResultSchema.extend({
  error: instanceofSchema(RunScriptError).or(
    instanceofSchema(UnknownScriptError),
  ),
  rawResult: ScriptResultRawResultSchema.optional(),
  type: z.literal(ERROR),
});

export const RunScriptSkippedResultSchema = BaseRunScriptResultSchema.extend({
  type: z.literal(SKIPPED),
});

export const RunScriptOkResultSchema = BaseRunScriptResultSchema.extend({
  rawResult: ScriptResultRawResultSchema,
  type: z.literal(OK),
});

export const RunScriptFailedResultSchema = BaseRunScriptResultSchema.extend({
  error: instanceofSchema(ScriptFailedError),
  rawResult: ScriptResultRawResultSchema.optional(),
  type: z.literal(FAILED),
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
