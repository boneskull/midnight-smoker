import {z} from 'zod';
import {RunScriptError} from '../component/package-manager/errors/run-script-error';
import {ScriptFailedError} from '../component/package-manager/errors/script-failed-error';
import {UnknownScriptError} from '../component/package-manager/errors/unknown-script-error';
import {instanceofSchema} from '../schema-util';

/**
 * Represents the zod schema for a {@link RunScriptError} instance.
 */
export const zRunScriptError = instanceofSchema(RunScriptError);

/**
 * Represents the zod schema for a {@link UnknownScriptError} instance.
 */
export const zUnknownScriptError = instanceofSchema(UnknownScriptError);

/**
 * Represents the zod schema for a {@link ScriptFailedError} instance.
 */
export const zScriptFailedError = instanceofSchema(ScriptFailedError);

/**
 * Represents the zod schema for any potential error instance thrown by a
 * `ScriptRunner`.
 */
export const zScriptError = z.union([
  zRunScriptError,
  zUnknownScriptError,
  zScriptFailedError,
]);
