import {type ExecOptions, type SpawnHookFn} from '#schema/exec/exec-output';
import {AbortSignalSchema} from '#schema/util/abort-signal';
import {multiColorFnSchema} from '#util/schema-util';
import {type ChildProcess, type SpawnOptions} from 'node:child_process';
import {z} from 'zod';

export const ChildProcessSchema: z.ZodType<ChildProcess> = z
  .any()
  .describe('A child process');

export const NodeOptionsSchema: z.ZodType<SpawnOptions | undefined> = z
  .any()
  .optional()
  .describe('Additional options to pass to `child_process.spawn()`');

export const SpawnHookFnSchema: z.ZodType<SpawnHookFn | undefined> =
  multiColorFnSchema(
    z.function(
      z.tuple([ChildProcessSchema, AbortSignalSchema] as [
        proc: typeof ChildProcessSchema,
        signal: typeof AbortSignalSchema,
      ]),
      z.void(),
    ),
  )
    .optional()
    .describe('Hook to run when the child process is spawned');

export const ExecOptionsSchema: z.ZodType<ExecOptions | undefined> = z
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

    nodeOptions: NodeOptionsSchema,

    onSpawn: SpawnHookFnSchema,

    /**
     * An `AbortSignal` which can be used to cancel the command.
     */
    signal: AbortSignalSchema.optional().describe('An AbortSignal'),

    timeout: z.number().optional().describe('Timeout in milliseconds'),

    trim: z
      .boolean()
      .optional()
      .describe('If true, trim `stdout` and `stderr`'),

    /**
     * If this is true, `stdout` and `stderr` will be echoed to the terminal.
     */
    verbose: z.boolean().optional().describe('If `true`, echo stdout & stderr'),
  })
  .optional()
  .describe('Options for an ExecFn or Executor');
