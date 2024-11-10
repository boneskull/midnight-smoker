/**
 * Assertions for plugin components
 *
 * These essentially just wrap `zod`'s `safeParse` method and throw a
 * `ValidationError` (a `SmokerError`) if the result is not successful.
 *
 * @packageDocumentation
 */

import {type Executor} from '#defs/executor';
import {type PkgManager} from '#defs/pkg-manager';
import {type Reporter} from '#defs/reporter';
import {type Rule, type RuleSchemaValue} from '#defs/rule';
import {asValidationError} from '#error/validation-error';
import {ExecutorSchema} from '#schema/executor';
import {PkgManagerSchema} from '#schema/pkg-manager';
import {ReporterSchema} from '#schema/reporter';
import {RuleSchema} from '#schema/rule';

/**
 * Asserts that `allegedRule` is a valid {@link Rule}.
 *
 * @param allegedRule Maybe a `Rule`
 * @throws {ValidationError} If `allegedRule` is not a valid `Rule`
 */
export function assertRule<T extends RuleSchemaValue | void = void>(
  allegedRule: unknown,
): asserts allegedRule is Rule<T> {
  const result = RuleSchema.safeParse(allegedRule);
  if (!result.success) {
    throw asValidationError(result.error);
  }
}

/**
 * Asserts that `allegedPkgManager` is a valid {@link PkgManager}.
 *
 * @param allegedPkgManager Maybe a `PkgManager`
 * @throws {ValidationError} If `allegedPkgManager` is not a valid `PkgManager`
 */
export function assertPkgManager(
  allegedPkgManager: unknown,
): asserts allegedPkgManager is PkgManager {
  const result = PkgManagerSchema.safeParse(allegedPkgManager);
  if (!result.success) {
    throw asValidationError(result.error);
  }
}

/**
 * Asserts that `allegedReporter` is a valid {@link Reporter}.
 *
 * @param allegedReporter Maybe a `Reporter`
 * @throws {ValidationError} If `allegedReporter` is not a valid `Reporter`
 */
export function assertReporter(
  allegedReporter: unknown,
): asserts allegedReporter is Reporter {
  const result = ReporterSchema.safeParse(allegedReporter);
  if (!result.success) {
    throw asValidationError(result.error);
  }
}

/**
 * Asserts that `allegedExecutor` is a valid {@link Executor}.
 *
 * @param allegedExecutor Maybe an `Executor`
 * @throws {ValidationError} If `allegedExecutor` is not a valid `Executor`
 */
export function assertExecutor(
  allegedExecutor: unknown,
): asserts allegedExecutor is Executor {
  const result = ExecutorSchema.safeParse(allegedExecutor);
  if (!result.success) {
    throw asValidationError(result.error);
  }
}
