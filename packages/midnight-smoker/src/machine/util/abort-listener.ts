import Debug from 'debug';
import {fromCallback, type ActorRef, type Snapshot} from 'xstate';

const debug = Debug('midnight-smoker:abort-listener');

export interface AbortEvent {
  type: 'ABORT';
}

export type AbortableActorRef = ActorRef<Snapshot<unknown>, AbortEvent>;

/**
 * Event to remove the event listener from the
 * {@link abortListener abortListener's} `AbortSignal`.
 */
export interface AbortListenerOffEvent {
  type: 'STOP';
}

export interface AbortListenerSubscribeEvent {
  type: 'SUBSCRIBE';
  ref: AbortableActorRef;
}

export interface AbortListenerUnsubscribeEvent {
  type: 'UNSUBSCRIBE';
  ref: AbortableActorRef;
}

/**
 * Events that can be sent to {@link abortListener}.
 */
export type AbortListenerEvent =
  | AbortListenerOffEvent
  | AbortListenerSubscribeEvent
  | AbortListenerUnsubscribeEvent;

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
export const abortListener = fromCallback<AbortListenerEvent, AbortSignal>(
  ({input: signal, receive}) => {
    const subscribers = new Set<AbortableActorRef>();

    const eventListener = () => {
      debug(
        'Signal aborted; sending ABORT to %d subscribers',
        subscribers.size,
      );
      for (const ref of subscribers) {
        if (ref.getSnapshot().status === 'stopped') {
          subscribers.delete(ref);
          continue;
        }
        ref.send({type: 'ABORT'});
      }
    };

    signal.addEventListener('abort', eventListener);

    receive((event) => {
      switch (event.type) {
        case 'SUBSCRIBE': {
          subscribers.add(event.ref);
          break;
        }
        case 'UNSUBSCRIBE': {
          subscribers.delete(event.ref);
          break;
        }
        case 'STOP':
          signal.removeEventListener('abort', eventListener);
          subscribers.clear();
          break;
      }
    });
  },
);
