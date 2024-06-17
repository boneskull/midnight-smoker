import {constant} from '#util/constant';

export const InstallEvent = constant({
  InstallBegin: 'InstallBegin',
  InstallFailed: 'InstallFailed',
  InstallOk: 'InstallOk',
  PkgManagerInstallBegin: 'PkgManagerInstallBegin',
  PkgManagerInstallFailed: 'PkgManagerInstallFailed',
  PkgManagerInstallOk: 'PkgManagerInstallOk',
  PkgInstallBegin: 'PkgInstallBegin',
  PkgInstallFailed: 'PkgInstallFailed',
  PkgInstallOk: 'PkgInstallOk',
});

export const PackEvent = constant({
  PackBegin: 'PackBegin',
  PackFailed: 'PackFailed',
  PackOk: 'PackOk',
  PkgManagerPackBegin: 'PkgManagerPackBegin',
  PkgManagerPackFailed: 'PkgManagerPackFailed',
  PkgManagerPackOk: 'PkgManagerPackOk',
  PkgPackOk: 'PkgPackOk',
  PkgPackBegin: 'PkgPackBegin',
  PkgPackFailed: 'PkgPackFailed',
});

export const ScriptEvent = {
  RunScriptBegin: 'RunScriptBegin',
  RunScriptFailed: 'RunScriptFailed',
  RunScriptOk: 'RunScriptOk',
  RunScriptEnd: 'RunScriptEnd',
  RunScriptError: 'RunScriptError',
  RunScriptsBegin: 'RunScriptsBegin',
  RunScriptsFailed: 'RunScriptsFailed',
  RunScriptsOk: 'RunScriptsOk',
  RunScriptSkipped: 'RunScriptSkipped',
  PkgManagerRunScriptsBegin: 'PkgManagerRunScriptsBegin',
  PkgManagerRunScriptsFailed: 'PkgManagerRunScriptsFailed',
  PkgManagerRunScriptsOk: 'PkgManagerRunScriptsOk',
} as const;

export const LintEvent = constant({
  RuleError: 'RuleError',
  RuleBegin: 'RuleBegin',
  RuleFailed: 'RuleFailed',
  RuleEnd: 'RuleEnd',
  RuleOk: 'RuleOk',
  PkgManagerLintBegin: 'PkgManagerLintBegin',
  PkgManagerLintFailed: 'PkgManagerLintFailed',
  PkgManagerLintOk: 'PkgManagerLintOk',
  LintBegin: 'LintBegin',
  LintFailed: 'LintFailed',
  LintOk: 'LintOk',
});

export const SmokerEvent = constant({
  ...InstallEvent,
  ...PackEvent,
  ...ScriptEvent,
  ...LintEvent,
  BeforeExit: 'BeforeExit',
  Noop: 'Noop',
  Lingered: 'Lingered',
  SmokeBegin: 'SmokeBegin',
  SmokeFailed: 'SmokeFailed',
  SmokeError: 'SmokeError',
  Aborted: 'Aborted',
  SmokeOk: 'SmokeOk',
  UnknownError: 'UnknownError',
});
