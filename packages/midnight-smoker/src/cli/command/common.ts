/**
 * Options for the `lint` and `run-script` commands
 *
 * @packageDocumentation
 */
import {MIDNIGHT_SMOKER} from '#constants';
import Debug from 'debug';
import {type Writable} from 'type-fest';
import {type ArgumentsCamelCase, type InferredOptionTypes} from 'yargs';

import {type GlobalOptionTypes} from './global-opts';
import {ARRAY_OPT_CFG, type CommandOptionRecord, OUTPUT_GROUP} from './opts';

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
  argv.verbose ??= Debug.enabled(MIDNIGHT_SMOKER);
}

const INPUT_GROUP = 'Input:';

/**
 * These options are needed by both `lint` and `run-script`
 */
export const CommonOptions = {
  all: {
    boolean: true,
    describe: 'Run in all workspaces',
    group: INPUT_GROUP,
  },
  'allow-private': {
    boolean: true,
    describe: 'Do not ignore private packages',
    group: INPUT_GROUP,
  },
  json: {
    boolean: true,
    describe: 'Output JSON only. Alias for "--reporter=json"',
    group: OUTPUT_GROUP,
  },
  linger: {
    boolean: true,
    describe: 'Do not clean up temp dir(s) after completion',
    group: OUTPUT_GROUP,
    hidden: true,
  },
  'pkg-manager': {
    alias: ['p', 'pm'],
    defaultDescription: '(auto)',
    describe: 'Use a specific package manager',
    group: INPUT_GROUP,
    ...ARRAY_OPT_CFG,
  },
  reporter: {
    alias: ['r'],
    defaultDescription: 'console',
    describe: 'Reporter(s) to use',
    group: OUTPUT_GROUP,
    ...ARRAY_OPT_CFG,
  },
  verbose: {
    boolean: true,
    describe: 'Enable verbose output',
    group: OUTPUT_GROUP,
  },
  workspace: {
    alias: ['w'],
    describe: 'Run script in a specific workspace or workspaces',
    group: INPUT_GROUP,
    ...ARRAY_OPT_CFG,
  },
} as const satisfies CommandOptionRecord;
