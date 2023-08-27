import type {
  InstallError,
  PackError,
  RuleError,
  ScriptError,
  SmokeFailedError,
} from './error';
import type {CheckFailure, CheckOk, CheckOptions} from './rules';
import type {
  InstallManifest,
  RunManifest,
  RunScriptResult,
  SmokeResults,
} from './types';

export interface InstallEventData {
  uniquePkgs: string[];
  packageManagers: string[];
  manifests: InstallManifest[];

  additionalDeps: string[];
}

export interface PackBeginEventData {
  packageManagers: string[];
}

export type PackOkEventData = InstallEventData;

export interface RunScriptsEventData {
  manifest: Record<string, RunManifest[]>;
  total: number;
}

export type RunScriptsBeginEventData = RunScriptsEventData;

export interface RunScriptsEndEventData extends RunScriptsEventData {
  results: RunScriptResult[];
  failed: number;
  passed: number;
}

export type RunScriptsOkEventData = RunScriptsEndEventData;

export type RunScriptsFailedEventData = RunScriptsEndEventData;

export interface RunScriptEventData {
  script: string;
  pkgName: string;
  total: number;
  current: number;
}

export interface RunScriptFailedEventData extends RunScriptEventData {
  error: ScriptError;
}

export interface RunChecksBeginEventData {
  config: CheckOptions;
  total: number;
}

export interface RunCheckEventData {
  rule: string;
  config: CheckOptions[keyof CheckOptions];
  current: number;
  total: number;
}

export type RunCheckBeginEventData = RunCheckEventData;

export interface RunCheckFailedEventData extends RunCheckEventData {
  failed: CheckFailure[];
}

export type RunCheckOkEventData = RunCheckEventData;

export interface RunChecksEndEventData {
  total: number;
  config: CheckOptions;
  passed: CheckOk[];
  failed: CheckFailure[];
}

export type RunChecksFailedEventData = RunChecksEndEventData;
export type RunChecksOkEventData = RunChecksEndEventData;

export interface SmokerEvent {
  InstallBegin: InstallEventData;
  InstallFailed: InstallError;
  InstallOk: InstallEventData;
  Lingered: string[];
  PackBegin: PackBeginEventData;
  PackFailed: PackError;
  PackOk: PackOkEventData;
  RuleError: RuleError;
  RunCheckBegin: RunCheckEventData;
  RunCheckFailed: RunCheckFailedEventData;
  RunCheckOk: RunCheckOkEventData;
  RunChecksBegin: RunChecksBeginEventData;
  RunChecksFailed: RunChecksFailedEventData;
  RunChecksOk: RunChecksOkEventData;
  RunScriptBegin: RunScriptEventData;
  RunScriptFailed: RunScriptFailedEventData;
  RunScriptOk: RunScriptEventData;
  RunScriptsBegin: RunScriptsBeginEventData;
  RunScriptsFailed: RunScriptsFailedEventData;
  RunScriptsOk: RunScriptsOkEventData;
  SmokeBegin: void;
  SmokeFailed: SmokeFailedError;
  SmokeOk: SmokeResults;
}

export const Event = {
  INSTALL_BEGIN: 'InstallBegin',
  INSTALL_FAILED: 'InstallFailed',
  INSTALL_OK: 'InstallOk',
  LINGERED: 'Lingered',
  PACK_BEGIN: 'PackBegin',
  PACK_FAILED: 'PackFailed',
  PACK_OK: 'PackOk',
  RULE_ERROR: 'RuleError',
  RUN_CHECK_BEGIN: 'RunCheckBegin',
  RUN_CHECK_FAILED: 'RunCheckFailed',
  RUN_CHECK_OK: 'RunCheckOk',
  RUN_CHECKS_BEGIN: 'RunChecksBegin',
  RUN_CHECKS_FAILED: 'RunChecksFailed',
  RUN_CHECKS_OK: 'RunChecksOk',
  RUN_SCRIPT_BEGIN: 'RunScriptBegin',
  RUN_SCRIPT_FAILED: 'RunScriptFailed',
  RUN_SCRIPT_OK: 'RunScriptOk',
  RUN_SCRIPTS_BEGIN: 'RunScriptsBegin',
  RUN_SCRIPTS_FAILED: 'RunScriptsFailed',
  RUN_SCRIPTS_OK: 'RunScriptsOk',
  SMOKE_BEGIN: 'SmokeBegin',
  SMOKE_FAILED: 'SmokeFailed',
  SMOKE_OK: 'SmokeOk',
} as const satisfies Record<string, keyof SmokerEvent>;
