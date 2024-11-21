import {NonEmptyStringSchema} from '#schema/util/util';
import {WorkspaceInfoSchema} from '#schema/workspace-info';

export const RunScriptManifestSchema = WorkspaceInfoSchema.extend({
  cwd: NonEmptyStringSchema,
  script: NonEmptyStringSchema,
});
