import {type Executor} from '#defs/executor';
import {type PkgManager} from '#defs/pkg-manager';
import {type Reporter} from '#defs/reporter';
import {type Rule, type RuleSchemaValue} from '#defs/rule';
import {asValidationError} from '#error/validation-error';
import {ExecutorSchema} from '#schema/executor';
import {PkgManagerSchema} from '#schema/pkg-manager';
import {ReporterSchema} from '#schema/reporter';
import {RuleSchema} from '#schema/rule';

export function assertRule<T extends RuleSchemaValue | void = void>(
  allegedRule: unknown,
): asserts allegedRule is Rule<T> {
  const result = RuleSchema.safeParse(allegedRule);
  if (!result.success) {
    throw asValidationError(result.error);
  }
}

export function assertPkgManager(
  allegedPkgManager: unknown,
): asserts allegedPkgManager is PkgManager {
  const result = PkgManagerSchema.safeParse(allegedPkgManager);
  if (!result.success) {
    throw asValidationError(result.error);
  }
}

export function assertReporter(
  allegedReporter: unknown,
): asserts allegedReporter is Reporter {
  const result = ReporterSchema.safeParse(allegedReporter);
  if (!result.success) {
    throw asValidationError(result.error);
  }
}

export function assertExecutor(
  allegedExecutor: unknown,
): asserts allegedExecutor is Executor {
  const result = ExecutorSchema.safeParse(allegedExecutor);
  if (!result.success) {
    throw asValidationError(result.error);
  }
}
