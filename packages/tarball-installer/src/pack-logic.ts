/**
 * Provides {@link packLogic}, which is a Promise Actor that invokes the `pack`
 * method of the `PkgManager` in its {@link PkgManagerPackContext} input
 * parameter.
 *
 * @packageDocumentation
 */

import {
  type PkgManagerPackContext,
  type WorkspaceInstallManifest,
} from 'midnight-smoker/defs/pkg-manager';
import {PackError, PackParseError} from 'midnight-smoker/error';
import {WorkspaceInstallManifestSchema} from 'midnight-smoker/schema';
import {isSmokerError} from 'midnight-smoker/util';
import {fromPromise} from 'xstate';
import 'xstate/guards';

import {type OperationLogicInput} from './logic';

/**
 * Input for {@link packLogic}
 */
export type PackLogicInput = OperationLogicInput<PkgManagerPackContext>;

export type PackLogicOutput = undefined | WorkspaceInstallManifest;

/**
 * Wraps the `pack` method of a `PkgManager` (which should pack a workspace into
 * a tarball).
 *
 * This actor logic _must_ reject with a {@link PackError} or
 * {@link PackParseError}.
 *
 * The package manager definition can do this itself, but if it does not, we
 * must coerce into a `PackError`. This is because--if the `Promise`
 * rejects--the information about the workspace being packed would be lost. That
 * information _must_ live in the rejection reason.
 *
 * If this actor is stopped, the `signal` will be aborted. The underlying
 * `PkgManager` may do something with it, but all we can do is return
 * `undefined`. **The only way for this actor to return `undefined` is if its
 * `signal` is aborted.**
 */
export const packLogic = fromPromise<PackLogicOutput, PackLogicInput>(
  async ({
    input: {
      ctx,
      envelope: {pkgManager, spec},
    },
    signal,
  }) => {
    await Promise.resolve();
    if (signal.aborted) {
      return;
    }
    try {
      const allegedManifest = await pkgManager.pack({...ctx, signal});
      if (signal.aborted) {
        return;
      }
      return WorkspaceInstallManifestSchema.parse({
        ...ctx.workspaceInfo,
        ...allegedManifest,
      });
    } catch (err) {
      if (signal.aborted) {
        return;
      }
      if (isSmokerError([PackError, PackParseError], err)) {
        throw err;
      }
      throw new PackError(
        `Failed to pack package "${ctx.pkgName}" for unknown reason; see \`cause\` property for details`,
        spec,
        {
          localPath: ctx.localPath,
          pkgJson: ctx.pkgJson,
          pkgJsonPath: ctx.pkgJsonPath,
          pkgJsonSource: ctx.pkgJsonSource,
          pkgName: ctx.pkgName,
        },
        ctx.tmpdir,
        err,
      );
    }
  },
);
