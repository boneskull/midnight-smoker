/**
 * Events emitted by `SmokeMachine`.
 *
 * @packageDocumenation
 * @see {@link SmokeMachineEvent}
 */

import {type CoreEventData} from '#event/core-events';
import {type EventData} from '#event/events';
import {type ComponentLoaderMachineOutput} from '#machine/component-loader-machine';
import {type PkgManagerMachineOutput} from '#machine/pkg-manager-machine';
import {type ReporterMachineOutput} from '#machine/reporter-machine';

import {type AbortEvent} from './abort.js';
import {type BusEvent} from './bus.js';
import {type SmokeMachineLingeredEvent} from './lingered.js';
import {type SmokeMachinePkgManagerEvent} from './pkg-manager.js';

/**
 * All events which `SmokeMachine` can receive.
 *
 * @event
 */
export type SmokeMachineEvent =
  | AbortEvent
  | BusEvent
  | SmokeMachineComponentLoaderMachineDoneEvent
  | SmokeMachineLingeredEvent
  | SmokeMachinePkgManagerEvent
  | SmokeMachinePkgManagerMachineDoneEvent
  | SmokeMachineReporterMachineDoneEvent
  | SmokeMachineShutdownEvent;

/**
 * All events which `SmokeMachine` emits.
 *
 * @event
 */
export type SmokeMachineEventEmitted = EventData<keyof CoreEventData>;

/**
 * Received when a `PkgManagerMachine` exits gracefully
 *
 * @event
 */
export type SmokeMachinePkgManagerMachineDoneEvent = {
  output: PkgManagerMachineOutput;
  type: 'xstate.done.actor.PkgManagerMachine.*';
};

/**
 * Received when a `ComponentLoaderMachine` exits gracefully
 *
 * @event
 */
export type SmokeMachineComponentLoaderMachineDoneEvent = {
  output: ComponentLoaderMachineOutput;
  type: 'xstate.done.actor.ComponentLoaderMachine';
};

/**
 * Received when a `ReporterMachine` exits gracefully
 *
 * @event
 */
export type SmokeMachineReporterMachineDoneEvent = {
  output: ReporterMachineOutput;
  type: 'xstate.done.actor.ReporterMachine.*';
};

/**
 * Can be sent to `SmokeMachine` to tell it to shut down once its work has
 * completed.
 *
 * The equivalent flag can be provided via `SmokeMachineInput`.
 *
 * @event
 */
export type SmokeMachineShutdownEvent = {
  type: 'SHUTDOWN';
};
