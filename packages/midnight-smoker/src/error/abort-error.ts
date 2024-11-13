import {BaseSmokerError} from '#error/base-error';
import {createDebug} from '#util/debug';
import {isError, isString} from '#util/guard/common';
import {inspect} from 'node:util';

const debug = createDebug(__filename);

export class AbortError extends BaseSmokerError<
  {
    id?: string;
    reason?: unknown;
  },
  Error | undefined
> {
  public readonly name = 'AbortError';

  constructor(reason: unknown, id?: string);
  constructor(message: string, cause: Error, id?: string);
  constructor(message?: string, id?: string);
  constructor(
    reasonOrMessage?: unknown,
    idOrCause?: Error | string,
    id?: string,
  ) {
    let msg: string;
    let error: Error | undefined;
    const reasonOrMsgIsError = isError(reasonOrMessage);
    if (isString(reasonOrMessage)) {
      msg = reasonOrMessage;
      if (isError(idOrCause)) {
        error = idOrCause;
      } else {
        id = idOrCause;
      }
    } else if (reasonOrMsgIsError) {
      msg = reasonOrMessage.message;
      error = reasonOrMessage;
    } else {
      msg = 'Aborted via signal';
      if (reasonOrMessage) {
        msg += '; reason: ';
        msg += inspect(reasonOrMessage, {sorted: true});
      }
    }
    super(msg, {id, reason: reasonOrMessage}, error);
    if (idOrCause) {
      debug('%s: %s', idOrCause, msg);
    } else {
      debug(msg);
    }
  }
}
