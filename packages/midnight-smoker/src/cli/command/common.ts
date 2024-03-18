/**
 * Options for the `lint` and `run-script` commands
 */

import Debug from 'debug';
import {type Writable} from 'type-fest';
import type {ArgumentsCamelCase, InferredOptionTypes} from 'yargs';
import {type GlobalOptionTypes} from './global-opts';
import {ARRAY_OPT_CFG, OUTPUT_GROUP, type CommandOptionRecord} from './opts';

const INPUT_GROUP = 'Input:';

/**
 * These options are needed by both `lint` and `run-script`
 */
export const CommonOptions = {
  all: {
    describe: 'Run in all workspaces',
    group: INPUT_GROUP,
    boolean: true,
  },
  'include-root': {
    describe: "Include the workspace root; must provide '--all'",
    implies: 'all',
    group: INPUT_GROUP,
    type: 'boolean',
  },
  json: {
    describe: 'Output JSON only. Alias for "--reporter=json"',
    group: OUTPUT_GROUP,
    boolean: true,
  },
  linger: {
    describe: 'Do not clean up temp dir(s) after completion',
    group: OUTPUT_GROUP,
    hidden: true,
    boolean: true,
  },
  workspace: {
    alias: ['w'],
    describe: 'Run script in a specific workspace or workspaces',
    group: INPUT_GROUP,
    ...ARRAY_OPT_CFG,
  },
  'pkg-manager': {
    alias: ['p', 'pm'],
    describe: 'Use a specific package manager',
    group: INPUT_GROUP,
    defaultDescription: '(auto)',
    ...ARRAY_OPT_CFG,
  },
  reporter: {
    alias: ['r'],
    describe: 'Reporter(s) to use',
    group: OUTPUT_GROUP,
    defaultDescription: 'console',
    ...ARRAY_OPT_CFG,
  },
  verbose: {
    describe: 'Enable verbose output',
    boolean: true,
    group: OUTPUT_GROUP,
  },
} as const satisfies CommandOptionRecord;

/**
 * These are the types of the common options after Yargs has parsed them
 */
export type CommonOptionTypes = GlobalOptionTypes &
  InferredOptionTypes<Writable<typeof CommonOptions>>;

/**
 * Middleware to set the `verbose` option to `true` if unset _and_ the
 * `DEBUG=midnight-smoker` present in env.
 *
 * @param argv Parsed args
 */
export function enableVerboseMiddleware(
  argv: ArgumentsCamelCase<CommonOptionTypes>,
): void {
  argv.verbose ??= Debug.enabled('midnight-smoker');
}
