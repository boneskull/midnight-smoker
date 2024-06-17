import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type ReporterDef} from '#schema/reporter-def';
import {type SomeRuleDef} from '#schema/some-rule-def';
import {type Merge} from 'type-fest';

interface BaseInitPayload {
  plugin: Readonly<PluginMetadata>;
  id: string;
}

export type PkgManagerInitPayload = Merge<
  BaseInitPayload,
  {
    def: PkgManagerDef;
    spec: PkgManagerSpec;
  }
>;

export type ReporterInitPayload = Merge<
  BaseInitPayload,
  {
    def: ReporterDef;
  }
>;

export type RuleInitPayload = Merge<
  BaseInitPayload,
  {
    def: SomeRuleDef;
  }
>;
