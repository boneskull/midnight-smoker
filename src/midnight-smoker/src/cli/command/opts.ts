/**
 * Reusable bits & bobs for commands & options
 *
 * @packageDocumentation
 */
import {type Options} from 'yargs';

/**
 * {@link Options} without the problematic `default`.
 *
 * @see {@link CommandOptionRecord}
 */
type CommandOption = Omit<Options, 'default'>;

/**
 * Defensive type to avoid setting {@link Options.default} on any given option,
 * which will cause default values set this way to override config file values.
 *
 * Generally this should be used in a `satisfies` clause if the options are
 * defined in object literals (which must be `as const`).
 *
 * @todo To be even more defensive, exclude the contents of `GlobalOptions`
 *   (which should already be in the options for any given command). Yargs will
 *   merge options and won't dedupe aliases, so it looks weird.
 */
export type CommandOptionRecord = Record<string, CommandOption>;

/**
 * Group for options that affect the output of the command
 */
export const OUTPUT_GROUP = 'Output:';

/**
 * Reusable config for array-type options
 */
export const ARRAY_OPT_CFG = {
  array: true,
  nargs: 1,
  requiresArg: true,
  string: true,
} as const satisfies CommandOption;

/**
 * It's a `--json` option!
 */
export const JsonOptions = {
  json: {
    describe: 'Output JSON',
    group: OUTPUT_GROUP,
    type: 'boolean',
  },
} as const satisfies CommandOptionRecord;
