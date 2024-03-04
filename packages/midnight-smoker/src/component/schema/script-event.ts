import {RunScriptManifestSchema} from '#schema/run-script-manifest';
import {
  RunScriptResultSchema,
  ScriptResultErrorSchema,
  ScriptResultRawResultSchema,
} from '#schema/run-script-result';
import {NonNegativeIntSchema} from '#util/schema-util';
import {z} from 'zod';

export type ScriptEventBaseData = z.infer<typeof ScriptEventBaseDataSchema>;
export type ScriptBeginEventData = z.infer<typeof ScriptBeginEventDataSchema>;
export type ScriptOkEventData = z.infer<typeof ScriptOkEventDataSchema>;
export type ScriptFailedEventData = z.infer<typeof ScriptFailedEventDataSchema>;

export type RunScriptsEndEventData = z.infer<
  typeof RunScriptsEndEventDataSchema
>;

export type RunScriptsBeginEventData = RunScriptsEventData;
export type RunScriptsEventData = z.infer<typeof RunScriptsEventDataSchema>;

export type RunScriptsOkEventData = RunScriptsEndEventData;

export type RunScriptsFailedEventData = RunScriptsEndEventData;

export const RunScriptsEventDataSchema = z.object({
  manifest: z
    .record(z.array(RunScriptManifestSchema))
    .describe(
      'Record of package manager specifiers to needed manifest for running custom scripts',
    ),
  total: NonNegativeIntSchema.default(0).describe(
    'Total number of scripts to run; <unique scripts> × <unique packages> × <package managers>',
  ),
});
export const RunScriptsEndEventDataSchema = RunScriptsEventDataSchema.extend({
  results: z
    .array(RunScriptResultSchema)
    .describe('List of RunScriptResult objects, one for each script run.'),
  failed: NonNegativeIntSchema.default(0).describe(
    'Count of scripts which failed',
  ),
  passed: NonNegativeIntSchema.default(0).describe(
    'Count of scripts that succeeded',
  ),
});

export const ScriptEventBaseDataSchema = RunScriptManifestSchema.extend({
  total: NonNegativeIntSchema.optional().describe(
    'Total number of scripts to run',
  ),
  current: NonNegativeIntSchema.optional().describe(
    `This script's position in the total number of scripts`,
  ),
});

export const ScriptBeginEventDataSchema = ScriptEventBaseDataSchema;

export const ScriptOkEventDataSchema = ScriptEventBaseDataSchema.extend({
  rawResult: ScriptResultRawResultSchema,
});

export const ScriptFailedEventDataSchema = ScriptEventBaseDataSchema.extend({
  error: ScriptResultErrorSchema,
});

export const ScriptSkippedEventDataSchema = ScriptEventBaseDataSchema.extend({
  skipped: z.literal(true),
});

export type ScriptSkippedEventData = z.infer<
  typeof ScriptSkippedEventDataSchema
>;

export type ScriptEventData = {
  RunScriptBegin: ScriptBeginEventData;
  RunScriptOk: ScriptOkEventData;
  RunScriptFailed: ScriptFailedEventData;
  RunScriptsBegin: RunScriptsBeginEventData;
  RunScriptsOk: RunScriptsOkEventData;
  RunScriptsFailed: RunScriptsFailedEventData;
  ScriptSkipped: ScriptSkippedEventData;
};
