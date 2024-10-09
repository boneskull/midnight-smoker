/**
 * Events common to all bus machines.
 *
 * @packageDocumenation
 */

/**
 * Event received by bus machines which instructs the machine to begin listening
 * for events sent by `SmokeMachine`, and send the final events to the
 * `ReporterMachine`s with the given `actorIds`.
 *
 * @event
 */
export interface ListenEvent {
  actorIds: string[];
  type: 'LISTEN';
}
