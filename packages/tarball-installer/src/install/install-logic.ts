import {type PkgManagerInstallContext} from 'midnight-smoker/defs/pkg-manager';
import {
  AbortError,
  asValidationError,
  InstallError,
} from 'midnight-smoker/error';
import {type ExecOutput, type InstallResult} from 'midnight-smoker/schema';
import {assertExecOutput, fromUnknownError} from 'midnight-smoker/util';
import {fromPromise} from 'xstate';

import {type OperationLogicInput} from '../logic';

/**
 * Input for {@link installLogic}
 */
export type InstallLogicInput = OperationLogicInput<PkgManagerInstallContext>;

export type InstallLogicOutput = InstallResult;

/**
 * Installs a package
 *
 * @todo More verbose errors
 */

export const installLogic = fromPromise<InstallLogicOutput, InstallLogicInput>(
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
    const {installManifest} = ctx;
    const {cwd} = installManifest;
    let execOutput: ExecOutput | undefined;
    try {
      execOutput = await pkgManager.install({...ctx, signal});
    } catch (err) {
      throw new InstallError(
        // is probably an ExecError
        fromUnknownError(err),
        installManifest,
        spec,
      );
    }

    if (signal.aborted) {
      throw new AbortError(signal.reason);
    }

    try {
      assertExecOutput(execOutput);
    } catch (err) {
      const validationErr = asValidationError(
        err,
        `${pkgManager.label} returned invalid output during install in dir ${cwd}`,
      );
      throw new InstallError(validationErr, installManifest, spec);
    }

    if (execOutput.exitCode !== 0) {
      throw new InstallError(execOutput, installManifest, spec);
    }

    return {installManifest, rawResult: execOutput};
  },
);
