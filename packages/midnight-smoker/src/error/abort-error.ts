import {BaseSmokerError} from '#error/base-error';
import Debug from 'debug';
import {isError} from 'lodash';

const debug = Debug('midnight-smoker:error:abort');

export class AbortError extends BaseSmokerError<{
  reason?: unknown;
  id?: string;
}> {
  public readonly id = 'AbortError';

  constructor(reason?: unknown, id?: string) {
    let msg = 'Aborted via signal';
    if (reason) {
      msg +=
        isError(reason) && 'message' in reason
          ? `: ${reason.message}`
          : `: ${String(reason)}`;
    }
    super(msg, {reason, id});
    debug(msg);
  }
}
