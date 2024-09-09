/**
 * Schemas for `PluginMetadata`
 *
 * @packageDocumentation
 * @internal
 */

export {type StaticPluginMetadata} from '#plugin/static-plugin-metadata';

export {type Executor} from '#schema/executor';

export type {NormalizedPackageJson} from '#schema/package-json';

export type {PkgManager} from '#schema/pkg-manager';

export {
  PluginMetadataOptsSchema,
  type NormalizedPluginMetadataOpts,
  type PluginMetadataOpts,
} from '#schema/plugin-metadata-opts';

export type {Reporter} from '#schema/reporter';

export type {Rule, SomeRule} from '#schema/rule';

export type {RuleSchemaValue} from '#schema/rule-schema-value';
