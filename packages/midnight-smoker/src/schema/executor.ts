import {type Executor, type ExecutorOpts} from '#defs/executor';
import {AbortSignalSchema} from '#schema/abort-signal';
import {ExecOutputSchema} from '#schema/exec-output';
import {StaticPkgManagerSpecSchema} from '#schema/static-pkg-manager-spec';
import {NonEmptyStringArraySchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * Schema for options for an {@link Executor}
 */
export const ExecutorOptsSchema: z.ZodType<ExecutorOpts> = z
  .object({
    /**
     * The working directory for the command.
     *
     * Overrides {@link SpawnOptions.cwd}
     */
    cwd: z
      .string()
      .optional()
      .describe(
        'The working directory for the command; overrides spawnOpts.cwd',
      ),

    /**
     * An `AbortSignal` which can be used to cancel the command.
     */
    signal: AbortSignalSchema.optional().describe('An AbortSignal'),

    /**
     * If this is true, `stdout` and `stderr` will be echoed to the terminal.
     */
    verbose: z.boolean().optional().describe('If `true`, echo stdout & stderr'),
  })
  .optional()
  .describe('Options for an Executor');

/**
 * Schema for an {@link Executor}
 *
 * @remarks
 * It is not possible to define a function schema in Zod that has optional
 * parameters in any sort of sane manner, as you can see. To avoid exposing this
 * ugliness to plugin authors, we use {@link customSchema} to hide it behind
 * {@link Executor}.
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
      ExecutorOptsSchema,
    ] as [
      spec: typeof StaticPkgManagerSpecSchema,
      args: typeof NonEmptyStringArraySchema,
      opts: typeof ExecutorOptsSchema,
    ]),
    z.promise(ExecOutputSchema),
  ),
]);
