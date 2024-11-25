import {
  type PkgManagerPackContext,
  type WorkspaceInstallManifest,
} from 'midnight-smoker/defs/pkg-manager';
import {AbortError, PackError, PackParseError} from 'midnight-smoker/error';
import {WorkspaceInstallManifestSchema} from 'midnight-smoker/schema';
import {isSmokerError} from 'midnight-smoker/util';
import {fromPromise} from 'xstate';
import 'xstate/guards';

import {type OperationLogicInput} from './logic';

/**
 * Input for {@link packLogic}
 */
export type PackLogicInput = OperationLogicInput<PkgManagerPackContext>;

export type PackLogicOutput = WorkspaceInstallManifest;

/**
 * Packs a package into a tarball
 *
 * This actor logic _must_ throw a {@link PackError} or {@link PackParseError}
 * unless an {@link AbortError} is thrown.
 *
 * The package manager definition can do this itself, but if it does not, we
 * must coerce into a `PackError`. This is because--if the `Promise`
 * rejects--the information about the workspace being packed would be lost. That
 * information _must_ live in the rejection reason.
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
      throw new AbortError(signal.reason);
    }
    try {
      const allegedManifest = await pkgManager.pack({...ctx, signal});
      return WorkspaceInstallManifestSchema.parse({
        ...ctx.workspaceInfo,
        ...allegedManifest,
      });
    } catch (err) {
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
