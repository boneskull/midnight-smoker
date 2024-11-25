import type {DesiredPkgManager} from '#schema/pkg-manager/desired-pkg-manager';

import {type ComponentKind, type ComponentKinds} from '#constants';
import {type PkgManager} from '#defs/pkg-manager';
import {type SomeRule} from '#defs/rule';
import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {type PluginMetadata} from '#plugin/plugin-metadata';
import {type SomeRuleConfig} from '#schema/lint/rule-options';
import {differenceWith} from 'remeda';

import {type Reporter} from '../defs/reporter';

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

/**
 * Envelope containing a package manager and its specification
 */
export type PkgManagerEnvelope = Readonly<
  {
    pkgManager: PkgManager;
    spec: PkgManagerSpec;
  } & BaseComponentEnvelope
>;

/**
 * Envelope containing a reporter
 */
export type ReporterEnvelope = Readonly<
  {
    reporter: Reporter;
  } & BaseComponentEnvelope
>;

/**
 * Envelope containing a rule and its configuration
 */
export type RuleEnvelope = Readonly<
  {
    config: SomeRuleConfig;
    rule: SomeRule;
  } & BaseComponentEnvelope
>;

/**
 * Envelope for a component of a given {@link ComponentKind}
 */
export type EnvelopeForKind<T extends ComponentKind> =
  T extends typeof ComponentKinds.PkgManager
    ? PkgManagerEnvelope
    : T extends typeof ComponentKinds.Reporter
      ? ReporterEnvelope
      : T extends typeof ComponentKinds.Rule
        ? RuleEnvelope
        : never;

/**
 * Given specs and a list of desired package managers, matches each desired
 * package manager to a spec, and returns the list of those items in
 * `desiredPkgManagers` not found in a spec.
 *
 * @param specs Known package manager specifications
 * @param desiredPkgManagers List of desired package managers, if any
 * @returns Desired package managers not found in given specs
 */
export function filterUnsupportedPkgManagersFromEnvelopes(
  specs: Readonly<PkgManagerSpec>[],
  desiredPkgManagers: readonly DesiredPkgManager[] = [],
) {
  return differenceWith(
    desiredPkgManagers,
    specs,
    (desiredPkgManager, {requestedAs}) => desiredPkgManager === requestedAs,
  );
}

export {type PkgManagerSpec};
