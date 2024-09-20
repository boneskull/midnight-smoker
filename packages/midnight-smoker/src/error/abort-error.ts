import {BaseSmokerError} from '#error/base-error';
import {createDebug} from '#util/debug';
import {isError} from '#util/guard/common';

const debug = createDebug(__filename);

export class AbortError extends BaseSmokerError<
  {
    id?: string;
    reason?: unknown;
  },
  Error | undefined
> {
  public readonly name = 'AbortError';

  constructor(reason?: unknown, id?: string) {
    let msg = 'Aborted via signal';
    const reasonIsError = isError(reason);
    if (reason) {
      msg += '; reason: ';
      msg +=
        reasonIsError && 'message' in reason ? reason.message : String(reason);
    }
    const error = reasonIsError ? reason : undefined;
    super(msg, {id, reason}, error);
    if (id) {
      debug('%s: %s', id, msg);
    } else {
      debug(msg);
    }
  }
}
