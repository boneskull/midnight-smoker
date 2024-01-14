import {type RunScriptError} from './run-script-error';
import {type ScriptFailedError} from './script-failed-error';
import {type UnknownScriptError} from './unknown-script-error';

/**
 * @group Errors
 */
export type ScriptError =
  | RunScriptError
  | UnknownScriptError
  | ScriptFailedError;
