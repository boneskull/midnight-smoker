/**
 * Declares the {@link Executor} interface, which is a wrapper around
 * {@link execa}.
 *
 * An implementation of `Executor` can then transform commands as needed.
 *
 * @packageDocumentation
 */

import {type ExecResult, ExecResultSchema} from '#schema/exec-result';
import {NonEmptyStringArraySchema} from '#util/schema-util';
import {type Options as ExecaOptions} from 'execa';
import {z} from 'zod';

import {AbortSignalSchema} from './abort-signal';
import {
  type StaticPkgManagerSpec,
  StaticPkgManagerSpecSchema,
} from './static-pkg-manager-spec';

/**
 * Options to pass along to the underlying child process spawner
 */
export type SpawnOpts = ExecaOptions;

export const SpawnOptsSchema: z.ZodType<SpawnOpts | undefined> = z
  .object({})
  .passthrough()
  .optional();

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
 * Options for an {@link Executor}
 */

export type ExecutorOpts =
  | {
      cwd?: string;
      signal?: AbortSignal;
      verbose?: boolean;
    }
  | undefined;

/**
 * An `Executor` is responsible for invoking package manager commands.
 *
 * A package manager calls its `Executor` instance with the proper arguments to
 * run.
 *
 * An `Executor` can be thought of as the final "transform" before the package
 * manager process gets spawned.
 *
 * @remarks
 * Currently this is `execa`, but it may change in the future.
 * @param spec - The package manager spec
 * @param args - The arguments to the package manager executable, likely
 *   including a command
 * @param opts - Options for the `Executor`
 * @param spawnOpts - Options for the underlying child process spawner
 */
export type Executor = (
  spec: StaticPkgManagerSpec,
  args: string[],
  opts?: ExecutorOpts,
  spawnOpts?: SpawnOpts,
) => Promise<ExecResult>;

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
    z.promise(ExecResultSchema),
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
    z.promise(ExecResultSchema),
  ),
  z.function(
    z.tuple([
      StaticPkgManagerSpecSchema,
      NonEmptyStringArraySchema,
      ExecutorOptsSchema,
      SpawnOptsSchema,
    ] as [
      spec: typeof StaticPkgManagerSpecSchema,
      args: typeof NonEmptyStringArraySchema,
      opts: typeof ExecutorOptsSchema,
      spawnOpts: typeof SpawnOptsSchema,
    ]),
    z.promise(ExecResultSchema),
  ),
]);
