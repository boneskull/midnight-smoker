/**
 * Utility functions for package manager plugins.
 */

import {partial} from 'lodash';
import {ExecError, isSmokerError} from 'midnight-smoker';

/**
 * Type guard for an {@link ExecError} instance.
 *
 * @param value Value to check
 * @returns `true` if the value is an {@link ExecError}
 */
export const isExecError = partial(isSmokerError, [ExecError]) as (
  value: unknown,
) => value is ExecError;
