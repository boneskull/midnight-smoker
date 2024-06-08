import {fromCallback} from 'xstate';

/**
 * Event to remove the event listener from the
 * {@link abortListener abortListener's} `AbortSignal`.
 */
export interface AbortListenerOffEvent {
  type: 'OFF';
}

/**
 * Events that can be sent to {@link abortListener}.
 */
export type AbortListenerEvents = AbortListenerOffEvent;

/**
 * A generic actor which can be used to listen for `abort` events on
 * `AbortSignal`s.
 *
 * Listens for the `abort` event emitted from an `AbortSignal`, and sends an
 * `ABORT` event back.
 *
 * @todo It appears that the "sent" event types are not known at compile time
 *   per the type def of {@link fromCallback} (see `InvokeCallback`). Fix later,
 *   if possible
 */
export const abortListener = fromCallback<AbortListenerEvents, AbortSignal>(
  ({input: signal, sendBack, receive}) => {
    const eventListener = () => {
      sendBack({type: 'ABORT'});
    };

    signal.addEventListener('abort', eventListener);

    receive((event) => {
      switch (event.type) {
        case 'OFF':
          signal.removeEventListener('abort', eventListener);
          break;
      }
    });
  },
);
