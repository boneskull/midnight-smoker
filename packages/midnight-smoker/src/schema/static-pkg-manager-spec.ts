import {NonEmptyStringSchema} from '#util/schema-util';
import {z} from 'zod';

export type StaticPkgManagerSpec = z.infer<typeof StaticPkgManagerSpecSchema>;

export const StaticPkgManagerSpecSchema = z.object({
  bin: NonEmptyStringSchema,
  version: NonEmptyStringSchema,
  isSystem: z.boolean(),
  spec: NonEmptyStringSchema,
});
