/**
 * Declares the {@link Executor} interface
 *
 * An implementation of `Executor` can then transform commands as needed.
 *
 * @packageDocumentation
 */

import {type ExecOptions, ExecOutputSchema} from '#schema/exec-result';
import {NonEmptyStringArraySchema} from '#util/schema-util';
import {type SpawnOptions as NodeOptions} from 'node:child_process';
import {z} from 'zod';

import {AbortSignalSchema} from './abort-signal';
import {type ExecOutput} from './exec-result';
import {
  type StaticPkgManagerSpec,
  StaticPkgManagerSpecSchema,
} from './static-pkg-manager-spec';

/**
 * Options to pass along to the underlying child process spawner
 */
export type {NodeOptions};

export const NodeOptionsSchema: z.ZodType<NodeOptions | undefined> = z
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

export type ExecutorOpts = ExecOptions | undefined;

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
 * This can be thought of as a wrapper around `exec()` from
 * `midnight-smoker/util`, allowing greater control over the spawned process and
 * its return value.
 * @param spec - The package manager spec
 * @param args - The arguments to the package manager executable, likely
 *   including a command
 * @param options - Options for the `Executor`
 * @param nodeOptions - Options for `child_process.spawn()` by way of `exec()`
 */
export type Executor = (
  spec: StaticPkgManagerSpec,
  args: string[],
  options?: ExecutorOpts,
) => Promise<ExecOutput>;

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
