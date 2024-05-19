import {RunScriptError} from '#error/run-script-error';
import {ScriptFailedError} from '#error/script-failed-error';
import {UnknownScriptError} from '#error/unknown-script-error';
import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * Represents the zod schema for any potential error instance thrown
 * `PkgManagerController.runScripts`
 *
 * TODO: Replace `instanceofSchema` with custom schema based on smokererror ID
 */
export const ScriptErrorSchema = z.union([
  instanceofSchema(RunScriptError),
  instanceofSchema(UnknownScriptError),
  instanceofSchema(ScriptFailedError),
]);

export type ScriptError = z.infer<typeof ScriptErrorSchema>;
