/**
 * Schemas for `PluginMetadata`
 *
 * @packageDocumentation
 * @internal
 */

export {type Executor} from '#defs/executor';

export type {PkgManager} from '#defs/pkg-manager';

export {type StaticPluginMetadata} from '#defs/plugin';

export type {Reporter} from '#defs/reporter';

export type {Rule, SomeRule} from '#defs/rule';

export type {RuleSchemaValue} from '#schema/lint/rule-schema-value';

export type {PackageJson as NormalizedPackageJson} from '#schema/package-json';

export {
  PluginMetadataOptsSchema,
  type NormalizedPluginMetadataOpts,
  type PluginMetadataOpts,
} from '#schema/plugin-metadata-opts';
