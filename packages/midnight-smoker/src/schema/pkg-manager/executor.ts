import {type Executor} from '#defs/executor';
import {ExecOptionsSchema} from '#schema/exec/exec-options';
import {ExecOutputSchema} from '#schema/exec/exec-output';
import {StaticPkgManagerSpecSchema} from '#schema/pkg-manager/static-pkg-manager-spec';
import {NonEmptyStringArraySchema} from '#schema/util/util';
import {z} from 'zod';

/**
 * Schema for an {@link Executor}
 */
export const ExecutorSchema: z.ZodType<Executor> = z.union([
  z.function(
    z.tuple([StaticPkgManagerSpecSchema, NonEmptyStringArraySchema] as [
      spec: typeof StaticPkgManagerSpecSchema,
      args: typeof NonEmptyStringArraySchema,
    ]),
    z.promise(ExecOutputSchema),
  ),
  z.function(
    z.tuple([
      StaticPkgManagerSpecSchema,
      NonEmptyStringArraySchema,
      ExecOptionsSchema,
    ] as [
      spec: typeof StaticPkgManagerSpecSchema,
      args: typeof NonEmptyStringArraySchema,
      options: typeof ExecOptionsSchema,
    ]),
    z.promise(ExecOutputSchema),
  ),
]);
