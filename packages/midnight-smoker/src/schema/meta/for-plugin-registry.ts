/**
 * Schemas for use by `PluginRegistry`
 *
 * @packageDocumentation
 * @internal
 */

export {type Executor} from '#defs/executor';

export type {PkgManager} from '#defs/pkg-manager';

export {type StaticPluginMetadata} from '#defs/plugin';

export type {SomeRule} from '#defs/rule';

export {createRuleOptionsSchema} from '#options/create-rule-options';

export type {PackageJson as NormalizedPackageJson} from '#schema/package-json';

export {PluginSchema, type Plugin} from '#schema/plugin';

export {
  RawRuleOptionsSchema,
  type BaseRuleConfigRecord,
} from '#schema/rule-options';

export {type SmokerOptions} from '#schema/smoker-options';

export {type WorkspaceInfo} from '#schema/workspace-info';

export {isErrnoException} from '#util/guard/errno-exception';

export type {Reporter} from '../../defs/reporter';
