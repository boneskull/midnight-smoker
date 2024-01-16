/**
 * Declares the {@link Executor} interface, which is a wrapper around
 * {@link execa}.
 *
 * An implementation of `Executor` can then transform commands as needed.
 *
 * @packageDocumentation
 * @todo Creating a custom `Executor` is not yet supported by the public plugin
 *   API.
 */
import type execa from 'execa';
import type {SpawnOptions} from 'node:child_process';
import type {SimpleMerge} from 'type-fest/source/merge';
import {z} from 'zod';
import {
  customSchema,
  zAbortSignal,
  zNonEmptyStringArray,
} from '../../schema-util';
import {
  zPkgManagerSpec,
  type PkgManagerSpec,
} from '../package-manager/pkg-manager-spec';
import {zExecResult, type ExecResult} from './executor-schema';

/**
 * Options for {@link Executor.exec}
 */
export interface ExecutorOpts {
  /**
   * If this is true, `stdout` and `stderr` will be echoed to the terminal.
   */
  verbose?: boolean;

  /**
   * An `AbortSignal` which can be used to cancel the command.
   */
  signal?: AbortSignal;

  /**
   * The working directory for the command.
   *
   * Overrides {@link SpawnOptions.cwd}
   */
  cwd?: string;
}

/**
 * Options to pass along to the underlying child process spawner.
 *
 * This is an unholy mishmash of {@link execa.Options} and {@link SpawnOptions}.
 */
export type SpawnOpts = SimpleMerge<
  SpawnOptions,
  {cwd?: string; stdio?: execa.Options['stdio']}
>;

export const zSpawnOpts = customSchema<SpawnOpts>(
  z.object({}).passthrough().optional(),
);

export const zExecutorOpts = customSchema<ExecutorOpts>(
  z
    .object({
      verbose: z
        .boolean()
        .optional()
        .describe('If `true`, echo stdout & stderr'),
      signal: zAbortSignal.optional().describe('An AbortSignal'),
      cwd: z
        .string()
        .optional()
        .describe(
          'The working directory for the command; overrides spawnOpts.cwd',
        ),
    })
    .optional(),
);

export type Executor = (
  spec: PkgManagerSpec,
  args: string[],
  opts?: ExecutorOpts,
  spawnOpts?: SpawnOpts,
) => Promise<ExecResult>;

export const zExecutor = customSchema<Executor>(
  z.union([
    z.function(
      z.tuple([zPkgManagerSpec, zNonEmptyStringArray] as [
        spec: typeof zPkgManagerSpec,
        args: typeof zNonEmptyStringArray,
      ]),
      z.promise(zExecResult),
    ),
    z.function(
      z.tuple([zPkgManagerSpec, zNonEmptyStringArray, zExecutorOpts] as [
        spec: typeof zPkgManagerSpec,
        args: typeof zNonEmptyStringArray,
        opts: typeof zExecutorOpts,
      ]),
      z.promise(zExecResult),
    ),
    z.function(
      z.tuple([
        zPkgManagerSpec,
        zNonEmptyStringArray,
        zExecutorOpts,
        zSpawnOpts,
      ] as [
        spec: typeof zPkgManagerSpec,
        args: typeof zNonEmptyStringArray,
        opts: typeof zExecutorOpts,
        spawnOpts: typeof zSpawnOpts,
      ]),
      z.promise(zExecResult),
    ),
  ]),
);
