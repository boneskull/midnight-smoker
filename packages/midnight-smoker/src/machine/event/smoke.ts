/**
 * Events emitted by `SmokeMachine`.
 *
 * @packageDocumenation
 * @see {@link SmokeMachineEvent}
 */

import {type CoreEvents} from '#constants/event';
import {type DataForEvent} from '#event/events';
import {type PkgManagerMachineOutput} from '#machine/pkg-manager-machine';
import {type PluginLoaderMachineOutput} from '#machine/plugin-loader-machine';
import {type ReporterMachineOutput} from '#machine/reporter-machine';
import {type AbortEvent} from './abort';
import {type BusEvent} from './bus';
import {type SmokeMachineInstallEvent} from './install';
import {type SmokeMachineLintEvent} from './lint';
import {type SmokeMachinePackEvent} from './pack';
import {type SmokeMachineScriptEvent} from './script';

/**
 * All events which `SmokeMachine` can receive.
 *
 * @event
 */
export type SmokeMachineEvent =
  | SmokeMachineInstallEvent
  | SmokeMachineShutdownEvent
  | SmokeMachineLingeredEvent
  | SmokeMachineLintEvent
  | SmokeMachinePluginLoaderMachineDoneEvent
  | SmokeMachinePackEvent
  | SmokeMachinePkgManagerMachineDoneEvent
  | SmokeMachineReporterMachineDoneEvent
  | SmokeMachineScriptEvent
  | BusEvent
  | AbortEvent;

/**
 * All events which `SmokeMachine` emits.
 *
 * @event
 */
export type SmokeMachineEventEmitted = DataForEvent<keyof typeof CoreEvents>;

/**
 * Received from a `PkgManagerMachine` containing information about a
 * "lingering" temp dir (before the `PkgManagerMachine` shuts down)
 *
 * @event
 */
export type SmokeMachineLingeredEvent = {
  directory: string;
  type: 'LINGERED';
};

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
 * Received when a `PluginLoaderMachine` exits gracefully
 *
 * @event
 */
export type SmokeMachinePluginLoaderMachineDoneEvent = {
  output: PluginLoaderMachineOutput;
  type: 'xstate.done.actor.PluginLoaderMachine.*';
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
