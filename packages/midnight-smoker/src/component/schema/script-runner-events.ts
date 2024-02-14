import {RunScriptManifestSchema} from '#schema/run-script-manifest';
import {zRunScriptResult} from '#schema/run-script-result';
import {zScriptError} from '#schema/script-error';
import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

export type ScriptEventData = z.infer<typeof ScriptEventDataSchema>;
export type ScriptBeginEventData = ScriptEventData;
export type ScriptOkEventData = ScriptEventData;
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
  total: z
    .number()
    .int()
    .default(0)
    .describe(
      'Total number of scripts to run; <unique scripts> × <unique packages> × <package managers>',
    ),
});
export const RunScriptsEndEventDataSchema = RunScriptsEventDataSchema.extend({
  results: z
    .array(zRunScriptResult)
    .describe('List of RunScriptResult objects, one for each script run.'),
  failed: z.number().int().default(0).describe('Count of scripts which failed'),
  passed: z
    .number()
    .int()
    .default(0)
    .describe('Count of scripts that succeeded'),
});

export const ScriptEventDataSchema = z.object({
  script: NonEmptyStringSchema.describe('Name of the script to run'),
  pkgName: NonEmptyStringSchema.describe(
    'Package name in which the script will run',
  ),
  total: z.number().optional().describe('Total number of scripts to run'),
  current: z
    .number()
    .optional()
    .describe(`This script's position in the total number of scripts`),
});

export const ScriptFailedEventDataSchema = ScriptEventDataSchema.setKey(
  'error',
  zScriptError.describe('Error describing the custom script failure'),
);
