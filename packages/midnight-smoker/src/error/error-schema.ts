import {z} from 'zod';
import {RunScriptError} from '../component/pkg-manager/errors/run-script-error';
import {ScriptFailedError} from '../component/pkg-manager/errors/script-failed-error';
import {UnknownScriptError} from '../component/pkg-manager/errors/unknown-script-error';
import {instanceofSchema} from '../util/schema-util';

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
