/**
 * Various schemas relating to `Executor`s.
 *
 * @packageDocumentation
 */

import {ExecError} from '#error/exec-error';
import {instanceofSchema} from '#util/schema-util';
import {z} from 'zod';

/**
 * Schema for the result of running an `Executor`
 *
 * Based on {@link execa.ExecaReturnValue}
 */
export const ExecResultSchema = z
  .object({
    all: z.string().optional().describe('The combination stdout and stderr'),
    stdout: z.string().describe('The stdout of the command'),
    stderr: z.string().describe('The stderr of the command'),
    command: z.string().describe('The command that was run'),
    exitCode: z.number().describe('The exit code of the command'),
    failed: z.boolean().describe('Whether or not the command failed'),
  })
  .describe('Useful bits of an ExecaReturnValue');

/**
 * It's {@link ExecResultSchema}, except it's also an `Error`
 */
export const ExecErrorSchema = instanceofSchema(ExecError);

/**
 * The result of running an `Executor`.
 */
export type ExecResult = z.infer<typeof ExecResultSchema>;
