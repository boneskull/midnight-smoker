import type * as Rule from 'midnight-smoker/rule';
import type {PackageJson as PackageJsonNS} from 'type-fest';

import {type PackageJson} from 'midnight-smoker/schema';

import {type EXPORTS_FIELD} from './constants';

export type ExportConditions = PackageJsonNS.ExportConditions;

export type Exports = PackageJsonNS.Exports;

export type NMEIssue = [message: string, options?: Rule.AddIssueOptions];

export type RootNMEContext = {keypath: [typeof EXPORTS_FIELD]} & Omit<
  NMEContext,
  'keypath'
>;

/**
 * A task to be run in the `no-missing-exports` rule.
 *
 * A `NMETask` resolves with an array of {@link NMEIssue} objects if issues were
 * found (otherwise it returns `undefined`).
 *
 * @template T Use to narrow the assumptions about the shape of the context
 *   (e.g., `exportsValue`)
 */
export type NMETask<T extends NMEContext<any> = NMEContext> = (
  ctx: T,
) => NMETaskResult | Promise<NMETaskResult>;

export type NMETaskResult = NMEIssue[] | undefined | void;

/**
 * Use {@link NMEContext} instead.
 */
export interface BaseNMEContext<
  T extends Exports | undefined = Exports | undefined,
> {
  /**
   * The `addIssue` method of a `Rule` is bound to a `RuleContext` object. We do
   * not need to worry about its context.
   */
  addIssue: Rule.AddIssueFn & ThisType<void>;
  exportsValue: T;
  installPath: string;
  keypath: readonly string[];
  pkgJson: PackageJson;
  pkgJsonPath: string;
  shouldAllowGlobs: boolean;
  shouldCheckImportConditional: boolean;
  shouldCheckOrder: boolean;
  shouldCheckRequireConditional: boolean;
  shouldCheckTypesConditional: boolean;
  shouldExportPackageJson: boolean;
}

export type NMEContext<T extends Exports | undefined = Exports | undefined> =
  Readonly<BaseNMEContext<T>>;

export type NMEGuard<T = unknown, Ctx extends NMEContext = NMEContext> = (
  value: T,
  ctx: Ctx,
) => boolean | Promise<boolean>;
