import {WorkspaceInfoSchema} from '#schema/workspaces';
import {NonEmptyStringSchema} from '#util/schema-util';
import {type z} from 'zod';

export const RunScriptManifestSchema = WorkspaceInfoSchema.extend({
  cwd: NonEmptyStringSchema,
  script: NonEmptyStringSchema,
});

export type RunScriptManifest = z.infer<typeof RunScriptManifestSchema>;
