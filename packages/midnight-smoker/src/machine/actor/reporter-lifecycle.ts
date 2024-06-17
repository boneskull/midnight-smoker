import {LifecycleError} from '#error/lifecycle-error';
import {type OmitSignal} from '#machine/util/actor-util';
import {type ReporterContext} from '#schema/reporter-context';
import {type ReporterDef} from '#schema/reporter-def';
import {fromUnknownError} from '#util/error-util';
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
      try {
        await setup({...ctx, signal});
      } catch (err) {
        throw new LifecycleError(
          fromUnknownError(err),
          'setup',
          'reporter',
          def.name,
          ctx.plugin,
        );
      }
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
      try {
        await teardown({...ctx, signal});
      } catch (err) {
        throw new LifecycleError(
          fromUnknownError(err),
          'teardown',
          'reporter',
          def.name,
          ctx.plugin,
        );
      }
    }
  },
);
