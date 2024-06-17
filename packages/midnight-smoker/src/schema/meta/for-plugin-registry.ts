/**
 * Schemas for use by `PluginRegistry`
 *
 * @packageDocumentation
 * @internal
 */

export {createRuleOptionsSchema} from '#schema/create-rule-options';

export {type Executor} from '#schema/executor';

export {type PkgManagerDef} from '#schema/pkg-manager-def';

export {PluginSchema, type Plugin} from '#schema/plugin';

export {type ReporterDef} from '#schema/reporter-def';

export {
  RawRuleOptionsSchema,
  type BaseRuleConfigRecord,
} from '#schema/rule-options';

export {type SomeRuleDef} from '#schema/some-rule-def';

export {type StaticPluginMetadata} from '#schema/static-plugin-metadata';
