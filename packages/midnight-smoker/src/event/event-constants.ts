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
} as const;

export const RunScriptEvent = {
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

  ScriptSkipped: 'ScriptSkipped',
} as const;

export const RuleEvent = {
  /**
   * {@inheritDoc SmokerEvents.RuleError}
   */
  RuleError: 'RuleError',

  /**
   * {@inheritDoc SmokerEvents.RunRuleBegin}
   */
  RunRuleBegin: 'RunRuleBegin',

  /**
   * {@inheritDoc SmokerEvents.RunRuleFailed}
   */
  RunRuleFailed: 'RunRuleFailed',

  /**
   * {@inheritDoc SmokerEvents.RunRuleOk}
   */
  RunRuleOk: 'RunRuleOk',

  /**
   * {@inheritDoc SmokerEvents.RunRulesBegin}
   */
  RunRulesBegin: 'RunRulesBegin',

  /**
   * {@inheritDoc SmokerEvents.RunRulesFailed}
   */
  RunRulesFailed: 'RunRulesFailed',

  /**
   * {@inheritDoc SmokerEvents.RunRulesOk}
   */
  RunRulesOk: 'RunRulesOk',
} as const;

/**
 * Enum-like containing constants for all {@link SmokerEvents}.
 */
export const SmokerEvent = {
  ...InstallEvent,
  ...PackEvent,
  ...RunScriptEvent,
  ...RuleEvent,

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
