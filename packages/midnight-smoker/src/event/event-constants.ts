export const InstallEvent = {
  /**
   * {@inheritDoc SmokerEvents.InstallBegin}
   */
  InstallBegin: 'InstallBegin',

  /**
   * {@inheritDoc SmokerEvents.InstallFailed}
   */
  InstallFailed: 'InstallFailed',

  /**
   * {@inheritDoc SmokerEvents.InstallOk}
   */
  InstallOk: 'InstallOk',

  /**
   * {@inheritDoc SmokerEvents.InstallBegin}
   */
  PkgManagerInstallBegin: 'PkgManagerInstallBegin',

  /**
   * {@inheritDoc SmokerEvents.InstallFailed}
   */
  PkgManagerInstallFailed: 'PkgManagerInstallFailed',

  /**
   * {@inheritDoc SmokerEvents.InstallOk}
   */
  PkgManagerInstallOk: 'PkgManagerInstallOk',

  PkgInstallBegin: 'PkgInstallBegin',
  PkgInstallFailed: 'PkgInstallFailed',
  PkgInstallOk: 'PkgInstallOk',
} as const;

export const PackEvent = {
  /**
   * {@inheritDoc SmokerEvents.PackBegin}
   */
  PackBegin: 'PackBegin',

  /**
   * {@inheritDoc SmokerEvents.PackFailed}
   */
  PackFailed: 'PackFailed',

  /**
   * {@inheritDoc SmokerEvents.PackOk}
   */
  PackOk: 'PackOk',

  /**
   * {@inheritDoc SmokerEvents.PkgManagerPackBegin}
   */
  PkgManagerPackBegin: 'PkgManagerPackBegin',

  /**
   * {@inheritDoc SmokerEvents.PkgManagerPackFailed}
   */
  PkgManagerPackFailed: 'PkgManagerPackFailed',

  /**
   * {@inheritDoc SmokerEvents.PkgManagerPackOk}
   */
  PkgManagerPackOk: 'PkgManagerPackOk',

  PkgPackOk: 'PkgPackOk',
  PkgPackBegin: 'PkgPackBegin',
  PkgPackFailed: 'PkgPackFailed',
} as const;

export const ScriptEvent = {
  /**
   * {@inheritDoc SmokerEvents.RunScriptBegin}
   */
  RunScriptBegin: 'RunScriptBegin',

  /**
   * {@inheritDoc SmokerEvents.RunScriptFailed}
   */
  RunScriptFailed: 'RunScriptFailed',

  /**
   * {@inheritDoc SmokerEvents.RunScriptOk}
   */
  RunScriptOk: 'RunScriptOk',

  /**
   * {@inheritDoc SmokerEvents.RunScriptError}
   */
  RunScriptError: 'RunScriptError',

  /**
   * {@inheritDoc SmokerEvents.RunScriptsBegin}
   */
  RunScriptsBegin: 'RunScriptsBegin',

  /**
   * {@inheritDoc SmokerEvents.RunScriptsFailed}
   */
  RunScriptsFailed: 'RunScriptsFailed',

  /**
   * {@inheritDoc SmokerEvents.RunScriptsOk}
   */
  RunScriptsOk: 'RunScriptsOk',

  /**
   * {@inheritDoc SmokerEvents.RunScriptSkipped}
   */
  RunScriptSkipped: 'RunScriptSkipped',

  PkgManagerRunScriptsBegin: 'PkgManagerRunScriptsBegin',
  PkgManagerRunScriptsFailed: 'PkgManagerRunScriptsFailed',
  PkgManagerRunScriptsOk: 'PkgManagerRunScriptsOk',
} as const;

export const LintEvent = {
  /**
   * {@inheritDoc SmokerEvents.RuleError}
   */
  RuleError: 'RuleError',

  /**
   * {@inheritDoc SmokerEvents.RuleBegin}
   */
  RuleBegin: 'RuleBegin',

  /**
   * {@inheritDoc SmokerEvents.RuleFailed}
   */
  RuleFailed: 'RuleFailed',

  /**
   * {@inheritDoc SmokerEvents.RuleOk}
   */
  RuleOk: 'RuleOk',

  PkgManagerLintBegin: 'PkgManagerLintBegin',
  PkgManagerLintFailed: 'PkgManagerLintFailed',
  PkgManagerLintOk: 'PkgManagerLintOk',

  /**
   * {@inheritDoc SmokerEvents.LintBegin}
   */
  LintBegin: 'LintBegin',

  /**
   * {@inheritDoc SmokerEvents.LintFailed}
   */
  LintFailed: 'LintFailed',

  /**
   * {@inheritDoc SmokerEvents.LintOk}
   */
  LintOk: 'LintOk',
} as const;

/**
 * Enum-like containing constants for all {@link SmokerEvents}.
 */
export const SmokerEvent = {
  ...InstallEvent,
  ...PackEvent,
  ...ScriptEvent,
  ...LintEvent,

  /**
   * {@inheritDoc SmokerEvents.BeforeExit}
   */
  BeforeExit: 'BeforeExit',

  /**
   * {@inheritDoc SmokerEvents.Lingered}
   */
  Lingered: 'Lingered',

  /**
   * {@inheritDoc SmokerEvents.SmokeBegin}
   */
  SmokeBegin: 'SmokeBegin',

  /**
   * {@inheritDoc SmokerEvents.SmokeFailed}
   */
  SmokeFailed: 'SmokeFailed',

  /**
   * {@inheritDoc SmokerEvents.SmokeOk}
   */
  SmokeOk: 'SmokeOk',

  /**
   * {@inheritDoc SmokerEvents.UnknownError}
   */
  UnknownError: 'UnknownError',
} as const;
