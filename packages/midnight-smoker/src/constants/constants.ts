import {constant} from '#constants/create-constant';

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
 *
 * @enum
 */
export const RuleSeverities = constant({
  Error: 'error',
  Warn: 'warn',
  Off: 'off',
});

/**
 * Default severity level of all rules.
 */
export const DEFAULT_RULE_SEVERITY = RuleSeverities.Error;

/**
 * Represents the kinds of components in the system.
 *
 * @enum
 */
export const ComponentKinds = constant({
  RuleDef: 'RuleDef',
  PkgManagerDef: 'PkgManagerDef',
  Executor: 'Executor',
  ReporterDef: 'ReporterDef',
});

/**
 * Represents the "kind" of a component.
 *
 * @see {@link ComponentKinds}
 */
export type ComponentKind = keyof typeof ComponentKinds;

/**
 * The name of this package
 */
export const MIDNIGHT_SMOKER = 'midnight-smoker';

/**
 * Default prefix to use when creating temp directories.
 *
 * Note that this is not the _entire_ prefix, but rather just part of it.
 */
export const DEFAULT_TMPDIR_PREFIX = 'unknown';

/**
 * The name of the `package.json` file.
 */
export const PACKAGE_JSON = 'package.json';

/**
 * Serves as the {@link entryPoint} for plugins which exist only in memory (as
 * far as this package is concerned)
 *
 * @internal
 */
export const TRANSIENT = '<transient>';

/**
 * Represents a "final" state of a state machine.
 */
export const FINAL = 'final';

/**
 * Represents a "parallel" state in a state machine.
 */
export const PARALLEL = 'parallel';

/**
 * Frequently used in events and outputs in a discriminated union
 */
export const OK = 'OK';

/**
 * Frequently used in events and outputs in a discriminated union
 */
export const FAILED = 'FAILED';

/**
 * Frequently used in events and outputs in a discriminated union
 */
export const ERROR = 'ERROR';

/**
 * Used for declaring that a script was skipped
 */
export const SKIPPED = 'SKIPPED';

/**
 * The name of the CLI
 */
export const SCRIPT_NAME = 'smoker';