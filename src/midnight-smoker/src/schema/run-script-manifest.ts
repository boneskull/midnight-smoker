import {type WorkspaceInfo, WorkspaceInfoSchema} from '#schema/workspace-info';
import {NonEmptyStringSchema} from '#util/schema-util';

export const RunScriptManifestSchema = WorkspaceInfoSchema.extend({
  cwd: NonEmptyStringSchema,
  script: NonEmptyStringSchema,
});

export type RunScriptManifest = {
  cwd: string;
  script: string;
} & WorkspaceInfo;
