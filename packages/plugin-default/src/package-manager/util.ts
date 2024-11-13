/**
 * Utility functions for package manager plugins.
 */

import {ExecError, isSmokerError} from 'midnight-smoker';
import {partialBind} from 'remeda';

/**
 * Type guard for an {@link ExecError} instance.
 *
 * @param value Value to check
 * @returns `true` if the value is an {@link ExecError}
 */
export const isExecError = partialBind(isSmokerError, [ExecError]) as (
  value: unknown,
) => value is ExecError;
