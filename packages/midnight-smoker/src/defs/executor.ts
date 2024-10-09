/**
 * Declares the {@link Executor} interface
 *
 * An implementation of `Executor` can then transform commands as needed.
 *
 * @packageDocumentation
 */

import {type ExecOptions, type ExecOutput} from '#schema/exec-result';
import {type StaticPkgManagerSpec} from '#schema/static-pkg-manager-spec';
import {type SpawnOptions as NodeOptions} from 'node:child_process';

/**
 * Options to pass along to the underlying child process spawner
 */
export type {NodeOptions};

export type {ExecOptions, ExecOutput, StaticPkgManagerSpec};

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
