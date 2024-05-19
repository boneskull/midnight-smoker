import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PkgManagerDef} from '#schema/pkg-manager-def';
import {type SomeReporterDef} from '#schema/reporter-def';
import {type SomeRuleDef} from '#schema/some-rule-def';

export interface BaseInitPayload {
  plugin: Readonly<PluginMetadata>;
}

export interface PkgManagerInitPayload extends BaseInitPayload {
  def: PkgManagerDef;
  spec: PkgManagerSpec;
}

export interface ReporterInitPayload extends BaseInitPayload {
  def: SomeReporterDef;
}

export interface RuleInitPayload extends BaseInitPayload {
  def: SomeRuleDef;
}
