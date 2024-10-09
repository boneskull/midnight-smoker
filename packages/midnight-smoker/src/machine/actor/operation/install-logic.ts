import {type PkgManagerInstallContext} from '#defs/pkg-manager';
import {AbortError} from '#error/abort-error';
import {InstallError} from '#error/install-error';
import {assertExecOutput} from '#executor';
import {type InstallResult, InstallResultSchema} from '#schema/install-result';
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
    const {cwd, pkgSpec} = installManifest;
    try {
      const rawResult = await pkgManager.install({...ctx, signal});
      assertExecOutput(rawResult);
      if (rawResult.exitCode !== 0) {
        throw new InstallError('Install failed', spec, pkgSpec, cwd, rawResult);
      }
      return InstallResultSchema.parse({installManifest, rawResult});
    } catch (err) {
      if (isSmokerError(InstallError, err)) {
        throw err;
      } else {
        throw new InstallError('Install failed', spec, pkgSpec, cwd, err);
      }
    }
  },
);
