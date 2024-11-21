/**
 * Declares the {@link Executor} interface
 *
 * An implementation of `Executor` transforms commands before reaching an
 * `ExecFn`.
 *
 * @packageDocumentation
 */

import {type ExecOptions, type ExecOutput} from '#schema/exec/exec-output';
import {type StaticPkgManagerSpec} from '#schema/pkg-manager/static-pkg-manager-spec';

export {type SpawnOptions} from 'node:child_process';

export type {ExecOptions, ExecOutput, StaticPkgManagerSpec};

/**
 * An `Executor` is responsible for invoking package manager commands.
 *
 * A package manager calls its `Executor` instance with the proper arguments to
 * run. The `Executor` then calls an `ExecFn` with those arguments and spawns a
 * child process.
 *
 * An `Executor` can be thought of as the final "transform" before the package
 * manager process gets spawned.
 *
 * @remarks
 * While an `Executor` is a component--and thus can be defined by plugins--there
 * may be no use-case for defining one outside of `midnight-smoker` itself. As
 * such, I don't intend to document it publicly.
 * @param spec - The package manager spec
 * @param args - The arguments to the package manager executable, likely
 *   including a command
 * @param options - Options for the underlying `ExecFn`
 */
export type Executor = (
  spec: StaticPkgManagerSpec,
  args: string[],
  options?: ExecOptions,
) => Promise<ExecOutput>;
