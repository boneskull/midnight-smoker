import {type PkgManagerInstallContext} from 'midnight-smoker/defs/pkg-manager';
import {AbortError, InstallError} from 'midnight-smoker/error';
import {type InstallResult, InstallResultSchema} from 'midnight-smoker/schema';
import {assertExecOutput, isSmokerError} from 'midnight-smoker/util';
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
