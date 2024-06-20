/**
 * Exports {@link ComputedPkgEventFields}, which is a union of computed fields
 * which are present in all `*Pkg*`-type events which are omitted from the event
 * data received in `SmokeMachine`.
 *
 * Instead, these fields are computed by bus machines.
 *
 * @packageDocumentation
 */

/**
 * These fields are omitted from the `*Pkg*` events because they are computed by
 * bus machines.
 */
export type ComputedPkgEventFields = 'currentPkg' | 'totalPkgs';
