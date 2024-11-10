/**
 * Common types used by events
 *
 * @packageDocumentation
 */

import {type EmptyObject} from '#util/schema-util';
import {type Simplify} from 'type-fest';

/**
 * These fields are omitted from the `*Pkg*` events because they are computed by
 * bus machines.
 */
export type ComputedPkgEventFields =
  | 'totalPkgs'
  | ComputedPkgManagerEventFields;

/**
 * These fields are omitted from the `*PkgManager*` events because they are
 * computed by the bus machines.
 *
 * The idea being that the `PkgManagerMachine` or whatever is sending them
 * doesn't need to track this information itself.
 */
export type ComputedPkgManagerEventFields =
  | 'totalPkgManagers'
  | 'totalPkgs'
  | 'workspaceInfo';

export type MachineEvent<
  Name extends string,
  T extends object = EmptyObject,
> = Simplify<
  {
    sender: string;
    type: Name;
  } & T
>;
