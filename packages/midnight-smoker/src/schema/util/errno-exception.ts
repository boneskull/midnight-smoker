import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';

import {NonEmptyStringSchema} from './util';

export const ErrnoExceptionSchema: z.ZodType<NodeJS.ErrnoException> =
  instanceofSchema(
    Error,
    z.object({
      code: NonEmptyStringSchema,
      errno: z.number().optional(),
      path: z.string().optional(),
      syscall: z.string().optional(),
    }),
  ).describe('An error thrown from Node.js with a required "code" prop');
