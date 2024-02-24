/**
 * Constants used throughout the application.
 *
 * @module midnight-smoker/constants
 */

/**
 * The default component ID.
 *
 * Used as last resort when no component ID is provided.
 */
export const DEFAULT_COMPONENT_ID = 'default';

/**
 * The default package manager.
 *
 * Used as last resort when no package manager specification is provided.
 */
export const DEFAULT_PKG_MANAGER_BIN = 'npm';

/**
 * Default version to use with the default package manager when the system
 * package manager version cannot be determined
 */
export const DEFAULT_PKG_MANAGER_VERSION = 'latest';

/**
 * The name of the default executor.
 *
 * Reminds me of the {@link DEFAULT_COMPONENT_ID default component ID}, for some
 * reason.
 */
export const DEFAULT_EXECUTOR_ID = 'default';

/**
 * The "system" executor, which invokes the system package manager.
 */
export const SYSTEM_EXECUTOR_ID = 'system';

/**
 * Enum-like object for severity levels a rule can be set to.
 */
export const RuleSeverities = {
  Error: 'error',
  Warn: 'warn',
  Off: 'off',
} as const;

/**
 * Default severity level of all rules.
 */
export const DEFAULT_RULE_SEVERITY = RuleSeverities.Error;

/**
 * Represents the kinds of components in the system.
 */
export const ComponentKinds = {
  Rule: 'Rule',
  RuleRunner: 'RuleRunner',
  ScriptRunner: 'ScriptRunner',
  PkgManagerDef: 'PkgManagerDef',
  Executor: 'Executor',
  ReporterDef: 'ReporterDef',
} as const;

/**
 * Represents the "kind" of a component.
 *
 * @see {@link ComponentKinds}
 */
export type ComponentKind = keyof typeof ComponentKinds;
