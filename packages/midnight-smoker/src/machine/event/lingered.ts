/**
 * Received from a `PkgManagerMachine` containing information about a
 * "lingering" temp dir (before the `PkgManagerMachine` shuts down)
 *
 * @event
 */

import {type PkgManagerEvents} from '#constants';

import {type MachineEvent} from './common';

/**
 * @deprecated Use {@link PkgManagerLingeredEvent}
 */
export type SmokeMachineLingeredEvent = {
  directory: string;
  type: 'LINGERED';
};

export type PkgManagerLingeredEvent = MachineEvent<
  typeof PkgManagerEvents.Lingered,
  {directory: string}
>;
