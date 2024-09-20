import {type OmitSignal, reporterContextWithSignal} from '#machine/util';
import {type ReporterContext} from '#reporter/reporter-context';
import {type Reporter} from '#schema/reporter';
import {isFunction} from '#util/guard/common';
import {fromPromise} from 'xstate';

/**
 * Input for {@link setupReporterLogic} and {@link teardownReporterLogic}
 */

export interface ReporterLifecycleHookInput {
  ctx: OmitSignal<ReporterContext>;
  reporter: Reporter;
}

/**
 * Invokes the `setup` lifecycle hook of a reporter by calling the
 * {@link Reporter.setup} function (if present).
 */
export const setupReporterLogic = fromPromise<void, ReporterLifecycleHookInput>(
  async ({input: {ctx, reporter}, signal}) => {
    const {setup} = reporter;
    if (isFunction(setup)) {
      try {
        await setup(reporterContextWithSignal(ctx, signal));
      } finally {
        delete ctx.signal;
      }
    }
  },
);

/**
 * Invokes the `teardown` lifecycle hook of a reporter by calling the
 * {@link Reporter.teardown} function (if present).
 */
export const teardownReporterLogic = fromPromise<
  void,
  ReporterLifecycleHookInput
>(async ({input: {ctx, reporter}, signal}) => {
  const {teardown} = reporter;
  if (isFunction(teardown)) {
    try {
      await teardown(reporterContextWithSignal(ctx, signal));
    } finally {
      delete ctx.signal;
    }
  }
});
