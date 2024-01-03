import type {z} from 'zod';
import type * as Executor from '../component/executor';
import type * as PkgManager from '../component/package-manager';
import type * as Reporter from '../component/reporter';
import type * as Rule from '../component/rule';
import type * as RuleRunner from '../component/rule-runner';
import type * as ScriptRunner from '../component/script-runner';
import type * as Errors from '../error/errors';
import type * as Event from '../event';
import type * as SchemaUtils from '../schema-util';
import type * as Helpers from './helpers';
import type {PluginMetadata} from './metadata';
import type {StaticPluginMetadata} from './static-metadata';

/**
 * Defines a new {@link Rule} component
 */
export type DefineRuleFn = <
  Name extends string,
  Schema extends Rule.RuleOptionSchema | void = void,
>(
  ruleDef: Rule.RuleDef<Name, Schema>,
) => PluginAPI;

/**
 * Defines a new {@link PackageManager} component
 */
export type DefinePackageManagerFn = (
  packageManager: PkgManager.PackageManagerModule,
  name?: string,
) => PluginAPI;

/**
 * Defines a new {@link ScriptRunner} component
 */
export type DefineScriptRunnerFn = (
  scriptRunner: ScriptRunner.ScriptRunner,
  name?: string,
) => PluginAPI;

/**
 * Defines a new {@link RuleRunner} component
 */
export type DefineRuleRunnerFn = (
  ruleRunner: RuleRunner.RuleRunner,
  name?: string,
) => PluginAPI;

/**
 * Defines a new {@link Executor} component
 */
export type DefineExecutorFn = (
  executor: Executor.Executor,
  name?: string,
) => PluginAPI;

export type DefineReporterFn = (reporter: Reporter.ReporterDef) => PluginAPI;

/**
 * The public plugin API which is provided to each plugin's entry function.
 *
 * @todo Implement support for `Listener`s
 */
export interface PluginAPI {
  /**
   * Collection of `Error` classes useful to plugin implementors.
   */
  Errors: typeof Errors;

  /**
   * Types related to `Executor`s.
   */
  Executor: typeof Executor;

  /**
   * Collection of helpers for various components
   */
  Helpers: typeof Helpers;

  /**
   * Namespace related to `PackageManager`s.
   */
  PkgManager: typeof PkgManager;

  /**
   * Namespace related to `Rule`s.
   */
  Rule: typeof Rule;

  /**
   * Namespace related to `RuleRunner`s.
   */
  RuleRunner: typeof RuleRunner;

  /**
   * Some useful pre-rolled {@link z zod} schemas; mainly useful for {@link Rule}
   * schemas.
   */
  SchemaUtils: typeof SchemaUtils;

  /**
   * Namespace related to `ScriptRunner`s
   */
  ScriptRunner: typeof ScriptRunner;

  /**
   * Namespace related to events
   */
  Event: typeof Event;

  /**
   * Basic information about other plugins.
   *
   * Re-computed at time of access.
   */
  plugins: readonly StaticPluginMetadata[];

  /**
   * Defines an {@link Executor.Executor} component
   */
  defineExecutor: DefineExecutorFn;

  /**
   * Defines a {@link PkgManager.PackageManager} component
   */
  definePackageManager: DefinePackageManagerFn;

  /**
   * Defines a {@link Rule.RuleDef} component
   *
   * @example
   *
   * ```ts
   * import type {PluginAPI} from 'midnight-smoker/plugin';
   *
   * export function plugin({defineRule}: PluginAPI) {
   *   defineRule({
   *     name: 'my-rule',
   *     async check() {
   *       // ...
   *     },
   *   });
   * }
   * ```;
   * ```
   */
  defineRule: DefineRuleFn;

  /**
   * Defines a {@link RuleRunner.RuleRunner} component
   */
  defineRuleRunner: DefineRuleRunnerFn;

  /**
   * Defines a {@link ScriptRunner.ScriptRunner} component
   */
  defineScriptRunner: DefineScriptRunnerFn;

  /**
   * Defines a {@link Reporter.ReporterDef} component
   */
  defineReporter: DefineReporterFn;

  /**
   * Metadata gathered about this plugin.
   *
   * The component maps within the metadata will be updated as the `define*`
   * functions are called.
   */
  metadata: PluginMetadata;

  /**
   * It's Zod.
   *
   * @see {@link https://zod.dev}
   */
  z: typeof z;

  /**
   * Alias of {@link z}
   */
  zod: typeof z;
}
