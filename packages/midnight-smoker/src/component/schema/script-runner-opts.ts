import {AbortSignalSchema} from '#util/schema-util';
import {z} from 'zod';

export const ScriptRunnerOptsSchema = z
  .object({
    signal: AbortSignalSchema.optional(),
  })
  .describe('Options for a ScriptRunner component');

export type ScriptRunnerOpts = z.infer<typeof ScriptRunnerOptsSchema>;
