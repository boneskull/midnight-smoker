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
