import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * Schema for `execa.ExecaError`
 */
export const ExecaErrorSchema = instanceofSchema(Error).pipe(
  z.object({
    command: z.string(),
    exitCode: z.number(),
    all: z.string().optional(),
    stderr: z.string(),
    stdout: z.string(),
    failed: z.boolean(),
  }),
);
