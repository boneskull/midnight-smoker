import {type PkgManager, type PkgManagerContext} from '#schema/pkg-manager';
import {isFunction} from '#util/guard/common';
import {fromPromise} from 'xstate';

/**
 * Input for the lifecycle actors
 */
export interface LifecycleLogicInput {
  ctx: PkgManagerContext;
  pkgManager: PkgManager;
}

/**
 * Runs the "teardown" lifecycle of a package manager, if defined
 */
export const teardownPkgManagerLogic = fromPromise<void, LifecycleLogicInput>(
  async ({input: {ctx, pkgManager}}) => {
    if (isFunction(pkgManager.teardown)) {
      await pkgManager.teardown(ctx);
    }
  },
);

/**
 * Runs the "setup" lifecycle of a package manager, if defined
 */
export const setupPkgManagerLogic = fromPromise<void, LifecycleLogicInput>(
  async ({input: {ctx, pkgManager}}) => {
    if (isFunction(pkgManager.setup)) {
      await pkgManager.setup(ctx);
    }
  },
);
