import {constant} from '#util/constant';

export const InstallEvents = constant({
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

export const PackEvents = constant({
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

export const ScriptEvents = {
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

export const LintEvents = constant({
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

export const SmokerEvents = constant({
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

export const Events = constant({
  ...InstallEvents,
  ...PackEvents,
  ...ScriptEvents,
  ...LintEvents,
  ...SmokerEvents,
});
