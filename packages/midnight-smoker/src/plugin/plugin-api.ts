import type * as SchemaUtils from '#schema/util/util';

import {type Executor} from '#defs/executor';
import {type PkgManager} from '#defs/pkg-manager';
import {type Reporter} from '#defs/reporter';
import {type Rule} from '#defs/rule';
import {type RuleSchemaValue} from '#schema/lint/rule-schema-value';
import {type z} from 'zod';

import type * as Helpers from './helpers';

import {type PluginMetadata} from './plugin-metadata';

/**
 * Defines a new {@link Rule} component
 */
export type DefineRuleFn = <Schema extends RuleSchemaValue | void = void>(
  rule: Rule<Schema>,
) => PluginAPI;

/**
 * Defines a new {@link PackageManager} component
 */
export type DefinePackageManagerFn = (
  packageManager: PkgManager,
  name?: string,
) => PluginAPI;

/**
 * Defines a new {@link Executor} component
 */
export type DefineExecutorFn = (executor: Executor, name?: string) => PluginAPI;

export type DefineReporterFn<Ctx extends object = object> = (
  reporter: Reporter<Ctx>,
  name?: string,
) => PluginAPI;

/**
 * The public plugin API which is provided to each plugin's entry function.
 *
 * @todo Implement support for `Listener`s
 */
export interface PluginAPI {
  /**
   * Defines an {@link Executor} component
   */
  defineExecutor: DefineExecutorFn;

  /**
   * Defines a {@link PkgManager} component
   *
   * @example
   *
   * ```ts
   * import {type PluginAPI} from 'midnight-smoker/plugin';
   *
   * export function plugin({definePackageManager}: PluginAPI) {
   *   definePackageManager({
   *     name: 'my-pkg-manager',
   *     bin: 'mypkgmanager',
   *     lockfile: 'my-lockfile.json'
   *     // ...
   *     async pack(ctx) {
   *       // ...
   *     }
   *     // ...
   *   });
   * }
   * ```
   */
  definePackageManager: DefinePackageManagerFn;

  /**
   * Defines a {@link Reporter.Reporter} component
   */
  defineReporter: DefineReporterFn<any>;

  /**
   * Defines a {@link Rule} component
   *
   * @example
   *
   * ```ts
   * import {type PluginAPI} from 'midnight-smoker/plugin';
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
   * Collection of helpers for various components
   */
  Helpers: Helpers.PluginHelpers;

  /**
   * Metadata gathered about this plugin.
   *
   * The component maps within the metadata will be updated as the `define*`
   * functions are called.
   */
  metadata: Readonly<PluginMetadata>;

  /**
   * Some useful pre-rolled {@link z zod} schemas; mainly useful for {@link Rule}
   * schemas.
   */
  SchemaUtils: typeof SchemaUtils;

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
