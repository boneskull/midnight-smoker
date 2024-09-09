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
  InstallFailed: 'INSTALL.FAILED',
  InstallOk: 'INSTALL.OK',
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
  PackBegin: 'PACK.BEGIN',
  PackFailed: 'PACK.FAILED',
  PackOk: 'PACK.OK',
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
  PkgManagerRunScriptsBegin: 'SCRIPTS.PKG_MANAGER.BEGIN',
  PkgManagerRunScriptsFailed: 'SCRIPTS.PKG_MANAGER.FAILED',
  PkgManagerRunScriptsOk: 'SCRIPTS.PKG_MANAGER.OK',
  RunScriptBegin: 'SCRIPTS.SCRIPT.BEGIN',
  RunScriptEnd: 'SCRIPTS.SCRIPT.END',
  RunScriptError: 'SCRIPTS.SCRIPT.RESULT.ERROR',
  RunScriptFailed: 'SCRIPTS.SCRIPT.RESULT.FAILED',
  RunScriptOk: 'SCRIPTS.SCRIPT.RESULT.OK',
  RunScriptsBegin: 'SCRIPTS.BEGIN',
  RunScriptsFailed: 'SCRIPTS.FAILED',
  RunScriptSkipped: 'SCRIPTS.SCRIPT.RESULT.SKIPPED',
  RunScriptsOk: 'SCRIPTS.OK',
});

/**
 * Lint-related event names
 *
 * @enum
 */
export const LintEvents = constant({
  LintBegin: 'LINT.BEGIN',
  LintFailed: 'LINT.FAILED',
  LintOk: 'LINT.OK',
  PkgManagerLintBegin: 'LINT.PKG_MANAGER.BEGIN',
  PkgManagerLintFailed: 'LINT.PKG_MANAGER.FAILED',
  PkgManagerLintOk: 'LINT.PKG_MANAGER.OK',
  RuleBegin: 'LINT.RULE.BEGIN',
  RuleEnd: 'LINT.RULE.END',
  RuleError: 'LINT.RULE.ERROR',
  RuleFailed: 'LINT.RULE.FAILED',
  RuleOk: 'LINT.RULE.OK',
  // PkgLintBegin: 'LINT.PKG.BEGIN',
  // PkgLintFailed: 'LINT.PKG.FAILED',
  // PkgLintOk: 'LINT.PKG.OK',
});

/**
 * Core event names
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
 * All event names
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
