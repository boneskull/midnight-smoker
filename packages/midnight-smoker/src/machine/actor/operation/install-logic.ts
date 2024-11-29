import {type PkgManagerInstallContext} from '#defs/pkg-manager';
import {AbortError} from '#error/abort-error';
import {InstallError} from '#error/install-error';
import {
  type InstallResult,
  InstallResultSchema,
} from '#schema/pkg-manager/install-result';
import {assertExecOutput} from '#util/guard/assert/exec-output';
import {isSmokerError} from '#util/guard/smoker-error';
import {fromPromise} from 'xstate';

import {type OperationLogicInput} from './logic';

/**
 * Input for {@link installLogic}
 */
export type InstallLogicInput = OperationLogicInput<PkgManagerInstallContext>;

/**
 * Installs a package
 *
 * @todo More verbose errors
 */

export const installLogic = fromPromise<InstallResult, InstallLogicInput>(
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
    const {installManifest} = ctx;
    try {
      const rawResult = await pkgManager.install({...ctx, signal});
      assertExecOutput(rawResult);
      if (rawResult.exitCode !== 0) {
        throw new InstallError(rawResult, installManifest, spec);
      }
      return InstallResultSchema.parse({installManifest, rawResult});
    } catch (err) {
      if (isSmokerError(InstallError, err)) {
        throw err;
      } else {
        throw new InstallError(err, installManifest, spec);
      }
    }
  },
);
