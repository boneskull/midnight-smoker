/**
 * Schemas for use by `PluginRegistry`
 *
 * @packageDocumentation
 * @internal
 */

export {createRuleOptionsSchema} from '#options/create-rule-options';

export {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';

export {type Executor} from '#schema/executor';

export type {NormalizedPackageJson} from '#schema/package-json';

export type {PkgManager} from '#schema/pkg-manager';

export {PluginSchema, type Plugin} from '#schema/plugin';

export type {Reporter} from '#schema/reporter';

export type {SomeRule} from '#schema/rule';

export {
  RawRuleOptionsSchema,
  type BaseRuleConfigRecord,
} from '#schema/rule-options';

export {type SmokerOptions} from '#schema/smoker-options';

export {type WorkspaceInfo} from '#schema/workspace-info';

export {isErrnoException} from '#util/guard/errno-exception';
