import {NonEmptyStringSchema} from '#schema/util/util';
import {BaseWorkspaceInfoSchema} from '#schema/workspace-info';

export const RunScriptManifestSchema = BaseWorkspaceInfoSchema.extend({
  cwd: NonEmptyStringSchema,
  script: NonEmptyStringSchema,
});
