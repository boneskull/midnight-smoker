import {
  RunScriptError,
  ScriptFailedError,
  UnknownScriptError,
} from '#error/script-error.js';
import {instanceofSchema} from '#util/schema-util.js';
import {z} from 'zod';

/**
 * Represents the zod schema for any potential error instance thrown by a
 * `ScriptRunner`.
 */

export const zScriptError = z.union([
  instanceofSchema(RunScriptError),
  instanceofSchema(UnknownScriptError),
  instanceofSchema(ScriptFailedError),
]);

export type ScriptError = z.infer<typeof zScriptError>;
