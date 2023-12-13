/**
 * Represents the kinds of components in the system.
 */
export const ComponentKinds = {
  Rule: 'Rule',
  RuleRunner: 'RuleRunner',
  ScriptRunner: 'ScriptRunner',
  PkgManagerModule: 'PkgManagerModule',
  Executor: 'Executor',
  Reporter: 'Reporter',
} as const;

/**
 * Represents the "kind" of a component.
 *
 * @see {@link ComponentKinds}
 */

export type ComponentKind = keyof typeof ComponentKinds;
