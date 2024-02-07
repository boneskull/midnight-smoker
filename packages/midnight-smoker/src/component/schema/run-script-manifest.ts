import {NonEmptyStringSchema} from '#util/schema-util.js';
import {z} from 'zod';

export const RunScriptManifestSchema = z.object({
  cwd: NonEmptyStringSchema,
  pkgName: NonEmptyStringSchema,
  script: NonEmptyStringSchema,
});

export type RunScriptManifest = z.infer<typeof RunScriptManifestSchema>;
