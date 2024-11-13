/**
 * Constants for event names
 *
 * @packageDocumentation
 */

import {constant} from '#constants/create-constant';

/**
 * Install-related event names
 *
 * @enum
 */
export const InstallEvents = constant({
  InstallBegin: 'INSTALL.BEGIN',
  InstallFailed: 'INSTALL.MAIN.FAILED',
  InstallOk: 'INSTALL.MAIN.OK',
  PkgInstallBegin: 'INSTALL.PKG.BEGIN',
  PkgInstallFailed: 'INSTALL.PKG.FAILED',
  PkgInstallOk: 'INSTALL.PKG.OK',
  PkgManagerInstallBegin: 'INSTALL.PKG_MANAGER.BEGIN',
  PkgManagerInstallFailed: 'INSTALL.PKG_MANAGER.FAILED',
  PkgManagerInstallOk: 'INSTALL.PKG_MANAGER.OK',
});

/**
 * Pack-related event names
 *
 * @enum
 */
export const PackEvents = constant({
  PackBegin: 'PACK.MAIN.BEGIN',
  PackFailed: 'PACK.MAIN.FAILED',
  PackOk: 'PACK.MAIN.OK',
  PkgManagerPackBegin: 'PACK.PKG_MANAGER.BEGIN',
  PkgManagerPackFailed: 'PACK.PKG_MANAGER.FAILED',
  PkgManagerPackOk: 'PACK.PKG_MANAGER.OK',
  PkgPackBegin: 'PACK.PKG.BEGIN',
  PkgPackFailed: 'PACK.PKG.FAILED',
  PkgPackOk: 'PACK.PKG.OK',
});

/**
 * Script-related event names
 *
 * @enum
 */
export const ScriptEvents = constant({
  PkgManagerScriptsBegin: 'SCRIPTS.PKG_MANAGER.BEGIN',
  PkgManagerScriptsFailed: 'SCRIPTS.PKG_MANAGER.FAILED',
  PkgManagerScriptsOk: 'SCRIPTS.PKG_MANAGER.OK',
  RunScriptBegin: 'SCRIPTS.SCRIPT.BEGIN',
  RunScriptEnd: 'SCRIPTS.SCRIPT.END',
  RunScriptError: 'SCRIPTS.SCRIPT.RESULT.ERROR',
  RunScriptFailed: 'SCRIPTS.SCRIPT.RESULT.FAILED',
  RunScriptOk: 'SCRIPTS.SCRIPT.RESULT.OK',
  RunScriptSkipped: 'SCRIPTS.SCRIPT.RESULT.SKIPPED',
  ScriptsBegin: 'SCRIPTS.BEGIN',
  ScriptsFailed: 'SCRIPTS.MAIN.FAILED',
  ScriptsOk: 'SCRIPTS.MAIN.OK',
});

/**
 * Mapping of lint event names to event types
 *
 * @enum
 */
export const LintEvents = constant({
  LintBegin: 'LINT.BEGIN',
  LintFailed: 'LINT.MAIN.FAILED',
  LintOk: 'LINT.MAIN.OK',
  PkgLintBegin: 'LINT.PKG.BEGIN',
  PkgLintFailed: 'LINT.PKG.FAILED',
  PkgLintOk: 'LINT.PKG.OK',
  PkgManagerLintBegin: 'LINT.PKG_MANAGER.BEGIN',
  PkgManagerLintFailed: 'LINT.PKG_MANAGER.FAILED',
  PkgManagerLintOk: 'LINT.PKG_MANAGER.OK',
  RuleBegin: 'LINT.RULE.BEGIN',
  RuleEnd: 'LINT.RULE.END',
  RuleError: 'LINT.RULE.ERROR',
  RuleFailed: 'LINT.RULE.FAILED',
  RuleOk: 'LINT.RULE.OK',
});

/**
 * Mapping of core event names to event types
 *
 * @enum
 */
export const CoreEvents = constant({
  Aborted: 'CORE.ABORTED',
  BeforeExit: 'CORE.BEFORE_EXIT',
  GuessedPkgManager: 'CORE.GUESSED_PKG_MANAGER',
  Lingered: 'CORE.LINGERED',
  Noop: 'CORE.NOOP',
  SmokeBegin: 'CORE.SMOKE.BEGIN',
  SmokeEnd: 'CORE.SMOKE.END',
  SmokeError: 'CORE.SMOKE.ERROR',
  SmokeFailed: 'CORE.SMOKE.FAILED',
  SmokeOk: 'CORE.SMOKE.OK',
});

/**
 * Mapping of all event names to event types
 *
 * @enum
 */
export const Events = constant({
  ...InstallEvents,
  ...PackEvents,
  ...ScriptEvents,
  ...LintEvents,
  ...CoreEvents,
});

/**
 * Wildcard event names for matching multiple event types
 *
 * @enum
 */
export const WildcardEvents = constant({
  AnyInstallPkg: 'INSTALL.PKG.*',
  AnyInstallPkgManager: 'INSTALL.PKG_MANAGER.*',
  AnyInstallResult: 'INSTALL.MAIN.*',
  AnyLintPkg: 'LINT.PKG.*',
  AnyLintPkgManager: 'LINT.PKG_MANAGER.*',
  AnyLintResult: 'LINT.MAIN.*',
  AnyLintRule: 'LINT.RULE.*',
  AnyPackPkg: 'PACK.PKG.*',
  AnyPackPkgManager: 'PACK.PKG_MANAGER.*',
  AnyPackResult: 'PACK.MAIN.*',
  AnyRunScriptResult: 'SCRIPTS.SCRIPT.RESULT.*',
  AnyScriptsPkgManager: 'SCRIPTS.PKG_MANAGER.*',
  AnyScriptsResult: 'SCRIPTS.MAIN.*',
});
