import {type Executor} from '#schema/executor';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type ReporterDef} from '#schema/reporter-def';
import {type RuleDef} from '#schema/rule-def';
import {type RuleDefSchemaValue} from '#schema/rule-options';
import type * as SchemaUtils from '#util/schema-util';
import type {z} from 'zod';
import type * as Helpers from './helpers';
import type {PluginMetadata} from './plugin-metadata';
import type {StaticPluginMetadata} from './static-metadata';

/**
 * Defines a new {@link Rule} component
 */
export type DefineRuleFn = <Schema extends RuleDefSchemaValue | void = void>(
  ruleDef: RuleDef<Schema>,
) => PluginAPI;

/**
 * Defines a new {@link PackageManager} component
 */
export type DefinePackageManagerFn = (
  packageManager: PkgManagerDef,
  name?: string,
) => PluginAPI;

/**
 * Defines a new {@link Executor} component
 */
export type DefineExecutorFn = (executor: Executor, name?: string) => PluginAPI;

export type DefineReporterFn<Ctx = any> = (
  reporter: ReporterDef<Ctx>,
  name?: string,
) => PluginAPI;

/**
 * The public plugin API which is provided to each plugin's entry function.
 *
 * @todo Implement support for `Listener`s
 */
export interface PluginAPI {
  /**
   * Collection of helpers for various components
   */
  Helpers: Helpers.PluginHelpers;

  /**
   * Some useful pre-rolled {@link z zod} schemas; mainly useful for {@link Rule}
   * schemas.
   */
  SchemaUtils: typeof SchemaUtils;

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
   * Defines a {@link PkgManager.PkgManager} component
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
   * Defines a {@link Reporter.ReporterDef} component
   */
  defineReporter: DefineReporterFn;

  /**
   * Metadata gathered about this plugin.
   *
   * The component maps within the metadata will be updated as the `define*`
   * functions are called.
   */
  metadata: Readonly<PluginMetadata>;

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
