import {AbortError} from '#error/abort-error';
import {PackError} from '#error/pack-error';
import {PackParseError} from '#error/pack-parse-error';
import {
  type InstallManifest,
  InstallManifestSchema,
} from '#schema/install-manifest';
import {type PkgManagerPackContext} from '#schema/pkg-manager';
import {isSmokerError} from '#util/guard/smoker-error';
import {fromPromise} from 'xstate';

import {type OperationLogicInput} from './logic';

/**
 * Input for {@link packLogic}
 */
export type PackLogicInput = OperationLogicInput<PkgManagerPackContext>;

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

export const packLogic = fromPromise<InstallManifest, PackLogicInput>(
  async ({
    input: {
      ctx,
      envelope: {pkgManager, spec},
    },
    signal,
  }) => {
    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }
    try {
      const allegedManifest = await pkgManager.pack({...ctx, signal});
      const manifest = InstallManifestSchema.parse(allegedManifest);
      return {localPath: ctx.localPath, ...manifest};
    } catch (err) {
      if (isSmokerError(PackError, err) || isSmokerError(PackParseError, err)) {
        throw err;
      }
      throw new PackError(
        `Failed to pack package "${ctx.pkgName}" for unknown reason; see \`cause\` property for details`,
        spec,
        {
          localPath: ctx.localPath,
          pkgJson: ctx.pkgJson,
          pkgJsonPath: ctx.pkgJsonPath,
          pkgName: ctx.pkgName,
          rawPkgJson: ctx.rawPkgJson,
        },
        ctx.tmpdir,
        err,
      );
    }
  },
);
