import {joinSignal} from '#machine/util';
import {type ReporterContext} from '#reporter/reporter-context';
import {type Reporter} from '#schema/reporter';
import {isFunction} from '#util/guard/common';
import {fromPromise} from 'xstate';

/**
 * Input for {@link setupReporterLogic} and {@link teardownReporterLogic}
 */

export interface ReporterLifecycleHookInput {
  ctx: ReporterContext;
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
      using _ = joinSignal(signal, ctx);
      await setup(ctx);
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
    using _ = joinSignal(signal, ctx);
    await teardown(ctx);
  }
});
