import {type OmitSignal} from '#machine/util/actor-util';
import {type ReporterContext} from '#schema/reporter-context';
import {type ReporterDef} from '#schema/reporter-def';
import {isFunction} from 'lodash';
import {fromPromise} from 'xstate';

/**
 * Input for {@link setupReporter} and {@link teardownReporter}
 */

export interface ReporterLifecycleHookInput {
  def: ReporterDef;
  ctx: OmitSignal<ReporterContext>;
}

/**
 * Invokes the `setup` lifecycle hook of a reporter by calling the
 * {@link ReporterDef.setup} function (if present).
 */

export const setupReporter = fromPromise<void, ReporterLifecycleHookInput>(
  async ({input: {def, ctx}, signal}) => {
    const {setup} = def;
    if (isFunction(setup)) {
      await setup({...ctx, signal});
    }
  },
);

/**
 * Invokes the `teardown` lifecycle hook of a reporter by calling the
 * {@link ReporterDef.teardown} function (if present).
 */

export const teardownReporter = fromPromise<void, ReporterLifecycleHookInput>(
  async ({input: {def, ctx}, signal}) => {
    const {teardown} = def;
    if (isFunction(teardown)) {
      await teardown({...ctx, signal});
    }
  },
);
