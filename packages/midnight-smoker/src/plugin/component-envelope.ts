import {type ComponentKind, type ComponentKinds} from '#constants';
import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type PkgManager} from '#schema/pkg-manager';
import {type Reporter} from '#schema/reporter';
import {type SomeRule} from '#schema/rule';
import {type SomeRuleConfig} from '#schema/rule-options';

/**
 * A component envelope is a wrapper around a component which provides metadata
 * not explicitly created by the component implementation itself.
 */
export type BaseComponentEnvelope = {
  /**
   * Unique component ID
   */
  id: string;

  /**
   * Owner of the component
   */
  plugin: Readonly<PluginMetadata>;
};

export type PkgManagerEnvelope = Readonly<
  {
    pkgManager: PkgManager;
    spec: PkgManagerSpec;
  } & BaseComponentEnvelope
>;

export type ReporterEnvelope = Readonly<
  {
    reporter: Reporter;
  } & BaseComponentEnvelope
>;

export type RuleEnvelope = Readonly<
  {
    config: SomeRuleConfig;
    rule: SomeRule;
  } & BaseComponentEnvelope
>;

export type EnvelopeForKind<T extends ComponentKind> =
  T extends typeof ComponentKinds.PkgManager
    ? PkgManagerEnvelope
    : T extends typeof ComponentKinds.Reporter
      ? ReporterEnvelope
      : T extends typeof ComponentKinds.Rule
        ? RuleEnvelope
        : never;
