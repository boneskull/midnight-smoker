import {z} from 'zod';
import {zRunScriptError, type RunScriptError} from './run-script-error';
import {
  zScriptFailedError,
  type ScriptFailedError,
} from './script-failed-error';
import {
  zUnknownScriptError,
  type UnknownScriptError,
} from './unknown-script-error';

/**
 * @group Errors
 */
export type ScriptError =
  | RunScriptError
  | UnknownScriptError
  | ScriptFailedError;

/**
 * Represents the zod schema for any potential error instance thrown by a
 * `ScriptRunner`.
 */
export const zScriptError = z.union([
  zRunScriptError,
  zUnknownScriptError,
  zScriptFailedError,
]);
