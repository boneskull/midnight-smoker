/**
 * Common types used by events
 *
 * @packageDocumentation
 */

import {type Merge} from 'type-fest';

/**
 * These fields are omitted from the `*Pkg*` events because they are computed by
 * bus machines.
 */
export type ComputedPkgEventField = 'totalPkgs' | ComputedPkgManagerEventField;

/**
 * These fields are omitted from the `*PkgManager*` events because they are
 * computed by the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
export type ComputedPkgManagerEventField =
  | 'totalPkgManagers'
  | 'totalPkgs'
  | 'workspaceInfo';

/**
 * Standard event type for inter-machine communication
 */
export type MachineEvent<
  Name extends string,
  T extends object = object,
> = Merge<
  {
    sender: string | string[];
    type: Name;
  },
  T
>;
