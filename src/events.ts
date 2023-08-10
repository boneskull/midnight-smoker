import type {SmokerError} from './error';
import {
  PackOkEventData,
  InstallEventData,
  RunScriptsBeginEventData,
  RunScriptsFailedEventData,
  RunScriptsOkEventData,
  RunScriptEventData,
  RunScriptFailedEventData,
} from './types';

export interface SmokerEvents {
  SmokeBegin: void;
  SmokeOk: void;
  SmokeFailed: SmokerError;
  PackBegin: void;
  PackFailed: SmokerError;
  PackOk: PackOkEventData;
  InstallBegin: InstallEventData;
  InstallFailed: SmokerError;
  InstallOk: InstallEventData;
  RunScriptsBegin: RunScriptsBeginEventData;
  RunScriptsFailed: RunScriptsFailedEventData;
  RunScriptsOk: RunScriptsOkEventData;
  RunScriptBegin: RunScriptEventData;
  RunScriptFailed: RunScriptFailedEventData;
  RunScriptOk: RunScriptEventData;
  Lingered: string[];
}

export const Events = {
  SMOKE_BEGIN: 'SmokeBegin',
  SMOKE_OK: 'SmokeOk',
  SMOKE_FAILED: 'SmokeFailed',
  PACK_BEGIN: 'PackBegin',
  PACK_FAILED: 'PackFailed',
  PACK_OK: 'PackOk',
  INSTALL_BEGIN: 'InstallBegin',
  INSTALL_FAILED: 'InstallFailed',
  INSTALL_OK: 'InstallOk',
  RUN_SCRIPTS_BEGIN: 'RunScriptsBegin',
  RUN_SCRIPTS_FAILED: 'RunScriptsFailed',
  RUN_SCRIPTS_OK: 'RunScriptsOk',
  RUN_SCRIPT_BEGIN: 'RunScriptBegin',
  RUN_SCRIPT_FAILED: 'RunScriptFailed',
  RUN_SCRIPT_OK: 'RunScriptOk',
  LINGERED: 'Lingered',
} as const satisfies Record<string, keyof SmokerEvents>;
