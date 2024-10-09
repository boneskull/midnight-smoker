/**
 * Contains types of global CLI options
 *
 * @packageDocumentation
 */

import {type Writable} from 'type-fest';
import {type InferredOptionTypes} from 'yargs';

import {ARRAY_OPT_CFG, type CommandOptionRecord} from './opts';

/**
 * These are the types of the global options after Yargs has parsed them
 */
export type GlobalOptionTypes = InferredOptionTypes<
  Writable<typeof GlobalOptions>
>;

/**
 * These options are needed by all commands.
 */
export const GlobalOptions = {
  config: {
    alias: ['c'],
    describe: 'Path to config file',
    global: true,
    nargs: 1,
    requiresArg: true,
    string: true,
  },
  plugin: {
    alias: ['P', 'plugins'],
    describe: 'Plugin(s) to use',
    ...ARRAY_OPT_CFG,
    global: true,
    nargs: 1,
    requiresArg: true,
  },
} as const satisfies CommandOptionRecord & Record<string, {global: true}>;
