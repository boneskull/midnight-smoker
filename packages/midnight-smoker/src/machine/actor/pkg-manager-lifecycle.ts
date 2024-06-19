import {
  type PkgManagerContext,
  type PkgManagerDef,
} from '#schema/pkg-manager-def';
import {isFunction} from 'lodash';
import {fromPromise} from 'xstate';

/**
 * Runs the "teardown" lifecycle of a package manager, if defined
 */

export const teardownPkgManager = fromPromise<void, LifecycleInput>(
  async ({input: {def, ctx}}) => {
    await Promise.resolve();
    if (isFunction(def.teardown)) {
      await def.teardown(ctx);
    }
  },
); /**
 * Runs the "setup" lifecycle of a package manager, if defined
 */

export const setupPkgManager = fromPromise<void, LifecycleInput>(
  async ({input: {def, ctx}}) => {
    await Promise.resolve();
    if (isFunction(def.setup)) {
      await def.setup(ctx);
    }
  },
);

/**
 * Input for the lifecycle actors
 */

export interface LifecycleInput {
  ctx: PkgManagerContext;
  def: PkgManagerDef;
}
