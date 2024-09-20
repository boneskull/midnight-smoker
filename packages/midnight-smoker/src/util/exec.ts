/**
 * Provides {@link txExec} and {@link ExecResult} for executing shell commands.
 *
 * @packageDocumentation
 */
import {constant} from '#constants';
import {ExecError} from '#error/exec-error';
import {SpawnError} from '#error/spawn-error';
import {
  type ExecFn,
  type ExecOptions,
  type ExecOutput,
  type ExecResult,
} from '#schema/exec-result';
import {createDebug} from '#util/debug';
import {fromUnknownError} from '#util/error-util';
import {defaultsDeep} from 'lodash';
import * as tx from 'tinyexec';

const debug = createDebug(__filename);

const DEFAULT_EXEC_OPTIONS = constant({
  nodeOptions: {
    cwd: process.cwd(),
    env: {
      DEBUG: '',
    },
  },
  trim: true,
}) satisfies ExecOptions;

const DEFAULT_TS_EXEC_OPTIONS = constant({
  throwOnError: false,
}) satisfies ExecOptions<Partial<tx.Options>>;

/**
 * Default implementation of a {@link ExecFn} using the `tinyexec` package.
 *
 * @param command Command name (optionally with path) to execute
 * @param argsOrOptions Args for command or options
 * @param options Options
 * @returns A {@link ExecResult} object
 */
export const tsExec: ExecFn<tx.Output, tx.OutputApi, Partial<tx.Options>> = (
  command,
  argsOrOptions?,
  options?: ExecOptions<Partial<tx.Options>>,
) => {
  let args: string[] = [];
  if (Array.isArray(argsOrOptions)) {
    args = argsOrOptions;
  } else if (argsOrOptions) {
    options = argsOrOptions;
  }

  /**
   * For returning in the {@link ExecOutput}
   */
  const commandString = [command, ...args].join(' ');

  const {trim, verbose, ...opts} = defaultsDeep(
    // defaultsDeep mutates its first parameter, so we give it a new obj
    {...options},
    DEFAULT_EXEC_OPTIONS,
    DEFAULT_TS_EXEC_OPTIONS,
  ) as ExecOptions<
    Partial<tx.Options> &
      typeof DEFAULT_EXEC_OPTIONS &
      typeof DEFAULT_TS_EXEC_OPTIONS
  >;
  const proc = tx.exec(command, args, opts);
  debug('Executing command in %s: %s', opts.nodeOptions.cwd, commandString);
  if (verbose) {
    proc.process?.stdout?.pipe(process.stdout);
    proc.process?.stderr?.pipe(process.stderr);
  }

  /**
   * This proxy wraps `_waitForOutput`, which is the internal function
   * `tinyexec` uses to resolve its `PromiseLike` {@link tx.Result} object. We
   * want this because we want greater control over the output and error
   * handling:
   *
   * - If the process fails to spawn, we want to throw a custom {@link SpawnError}
   * - When the process exits without error, we want to add custom properties to
   *   its output
   * - We also want to trim the output (optionally; default `true`)
   * - If the exit code is non-zero, we want to throw our own {@link ExecError}
   *   (maybe??)
   */
  return new Proxy(proc, {
    get(target, prop) {
      if (prop === '_waitForOutput') {
        const _waitForOutput = Reflect.get(
          target,
          prop,
        ) as () => Promise<tx.Output>;
        return async (): Promise<ExecOutput> => {
          let output: tx.Output;
          try {
            output = await _waitForOutput.call(target);
          } catch (err) {
            throw new SpawnError(
              `Failed to spawn command: ${commandString}`,
              fromUnknownError(err),
            );
          }
          const execOutput: ExecOutput = {
            ...output,
            command: commandString,
            cwd: opts.nodeOptions.cwd,
            exitCode: target.exitCode,
            stderr: trim ? output.stderr.trim() : output.stderr,
            stdout: trim ? output.stdout.trim() : output.stdout,
          };
          if (target.exitCode !== 0) {
            throw new ExecError(
              `Command failed in ${opts.nodeOptions.cwd}: ${commandString}`,
              execOutput,
            );
          }
          return execOutput;
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return Reflect.get(target, prop);
    },
  }) as ExecResult<tx.Output, tx.OutputApi>;
};

/**
 * The main function used for executing shell commands.
 *
 * This should be consumed by all `Executor` implementations.
 */
export const exec = tsExec;
