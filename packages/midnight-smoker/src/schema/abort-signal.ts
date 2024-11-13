import {instanceofSchema} from '#util/schema-util';
import {type ZodType} from 'zod';

/**
 * Schema for a {@link AbortSignal}
 */

export const AbortSignalSchema: ZodType<AbortSignal> =
  instanceofSchema(AbortSignal).describe('An AbortSignal');
