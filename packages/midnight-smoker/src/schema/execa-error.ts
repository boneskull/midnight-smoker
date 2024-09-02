import {ExecResultSchema} from '#schema/exec-result';
import {instanceofSchema} from '#util/schema-util';
import {type ExecaError} from 'execa';
import {z} from 'zod';

/**
 * Schema for an {@link ExecaError}.
 */
export const ExecaErrorSchema: z.ZodType<ExecaError> = instanceofSchema(
  Error,
  ExecResultSchema.and(
    z.object({
      originalMessage: z
        .string()
        .optional()
        .describe(
          'Original error message in case the process exited due to an `error` event or timeout',
        ),
      shortMessage: z
        .string()
        .describe('Same as `message` but does not include the stdout/stderr'),
    }),
  ),
).describe('An error thrown by `execa`');
