/**
 * Base types for events
 *
 * @packageDocumentation
 */

import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';
import {type WorkspaceInfo} from '#schema/workspace-info';
import {type Result} from '#util/result';

/**
 * Any event beginning with `PkgManager*` should extend this type
 */
export type PkgManagerEventBase = {
  pkgManager: StaticPkgManagerSpec;
  totalPkgManagers: number;
  workspaceInfo: Result<WorkspaceInfo>[];
};

/**
 * Any event beginning with `Pkg*` (not `PkgManager*`) should extend this type.
 *
 * `workspace` may be omitted if the event is not related to a workspace.
 */
export type PkgEventBase = {
  totalPkgs: number;
  workspace?: Result<WorkspaceInfo>;
} & PkgManagerEventBase;
