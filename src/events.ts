import type {SmokerError} from './error';
import type {RuleConfig, CheckFailure, CheckOk} from './rules';
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
  error: SmokerError;
}

export interface RunChecksBeginEventData {
  config: RuleConfig;
  total: number;
}

export interface RunCheckEventData {
  rule: string;
  config: RuleConfig[keyof RuleConfig];
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
  config: RuleConfig;
  passed: CheckOk[];
  failed: CheckFailure[];
}

export type RunChecksFailedEventData = RunChecksEndEventData;
export type RunChecksOkEventData = RunChecksEndEventData;

export interface SmokerEvents {
  InstallBegin: InstallEventData;
  InstallFailed: SmokerError;
  InstallOk: InstallEventData;
  Lingered: string[];
  PackBegin: PackBeginEventData;
  PackFailed: SmokerError;
  PackOk: PackOkEventData;
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
  SmokeFailed: SmokerError;
  SmokeOk: SmokeResults;
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
  RUN_CHECKS_BEGIN: 'RunChecksBegin',
  RUN_CHECKS_FAILED: 'RunChecksFailed',
  RUN_CHECKS_OK: 'RunChecksOk',
  RUN_CHECK_BEGIN: 'RunCheckBegin',
  RUN_CHECK_FAILED: 'RunCheckFailed',
  RUN_CHECK_OK: 'RunCheckOk',
} as const satisfies Record<string, keyof SmokerEvents>;
