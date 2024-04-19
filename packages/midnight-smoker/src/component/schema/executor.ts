/**
 * Declares the {@link Executor} interface, which is a wrapper around
 * {@link execa}.
 *
 * An implementation of `Executor` can then transform commands as needed.
 *
 * @packageDocumentation
 */

import {type PkgManagerSpec} from '#pkg-manager/pkg-manager-spec';
import {ExecResultSchema, type ExecResult} from '#schema/exec-result';
import {PkgManagerSpecSchema} from '#schema/pkg-manager-spec';
import {
  AbortSignalSchema,
  NonEmptyStringArraySchema,
  customSchema,
} from '#util/schema-util';
import type execa from 'execa';
import type {SpawnOptions} from 'node:child_process';
import type {SimpleMerge} from 'type-fest/source/merge';
import {z} from 'zod';

/**
 * Options to pass along to the underlying child process spawner.
 *
 * This is an unholy mishmash of {@link execa.Options} and {@link SpawnOptions}.
 */
export type SpawnOpts = SimpleMerge<
  SpawnOptions,
  {cwd?: string; stdio?: execa.Options['stdio']}
>;

export const SpawnOptsSchema = customSchema<SpawnOpts>(
  z.object({}).passthrough().optional(),
);

/**
 * Schema for options for an {@link Executor}
 */
export const ExecutorOptsSchema = z
  .object({
    /**
     * If this is true, `stdout` and `stderr` will be echoed to the terminal.
     */
    verbose: z.boolean().optional().describe('If `true`, echo stdout & stderr'),

    /**
     * An `AbortSignal` which can be used to cancel the command.
     */
    signal: AbortSignalSchema.optional().describe('An AbortSignal'),

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
  })
  .optional()
  .describe('Options for an Executor');

/**
 * Options for an {@link Executor}
 */
export type ExecutorOpts = z.infer<typeof ExecutorOptsSchema>;

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
  spec: PkgManagerSpec,
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
export const ExecutorSchema = customSchema<Executor>(
  z
    .union([
      z.function(
        z.tuple([PkgManagerSpecSchema, NonEmptyStringArraySchema] as [
          spec: typeof PkgManagerSpecSchema,
          args: typeof NonEmptyStringArraySchema,
        ]),
        z.promise(ExecResultSchema),
      ),
      z.function(
        z.tuple([
          PkgManagerSpecSchema,
          NonEmptyStringArraySchema,
          ExecutorOptsSchema,
        ] as [
          spec: typeof PkgManagerSpecSchema,
          args: typeof NonEmptyStringArraySchema,
          opts: typeof ExecutorOptsSchema,
        ]),
        z.promise(ExecResultSchema),
      ),
      z.function(
        z.tuple([
          PkgManagerSpecSchema,
          NonEmptyStringArraySchema,
          ExecutorOptsSchema,
          SpawnOptsSchema,
        ] as [
          spec: typeof PkgManagerSpecSchema,
          args: typeof NonEmptyStringArraySchema,
          opts: typeof ExecutorOptsSchema,
          spawnOpts: typeof SpawnOptsSchema,
        ]),
        z.promise(ExecResultSchema),
      ),
    ])
    .transform((value) => {
      console.log(value.length);
      return value;
    }),
);
