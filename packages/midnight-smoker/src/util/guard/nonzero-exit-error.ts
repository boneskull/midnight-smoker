import {isError} from '#util/guard/common';
import {type NonZeroExitError} from 'tinyexec';
import {type SetRequired} from 'type-fest';

export function isNonZeroExitError(
  err?: unknown,
): err is SetRequired<NonZeroExitError, 'output'> {
  return (
    isError(err) &&
    'output' in err &&
    typeof err.output === 'object' &&
    'result' in err &&
    'exitCode' in err
  );
}
