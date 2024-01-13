/**
 * Defines the `run-script` command using {@link RunScriptCommand}
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import type {ArgumentsCamelCase, Argv, InferredOptionTypes} from 'yargs';
import {castArray} from '../../schema-util';
import {Smoker} from '../../smoker';
import {
  ARRAY_OPT_CFG,
  handleRejection,
  type SmokerYargsOptions,
} from '../cli-util';
import {BaseCommand} from './base';
import type {CommonOptionTypes, GlobalOptionTypes} from './common';
import {CommonOptions, enableVerboseMiddleware} from './common';

const debug = Debug('midnight-smoker:cli:run-script');

const BEHAVIOR_GROUP = 'Script Behavior:';

/**
 * Options for the `run-script` command
 */
const RunScriptOptions = {
  ...CommonOptions,
  add: {
    describe: 'Additional dependency to provide to script(s)',
    group: BEHAVIOR_GROUP,
    ...ARRAY_OPT_CFG,
  },
  bail: {
    alias: ['fail-fast'],
    describe: 'Halt on first error',
    group: BEHAVIOR_GROUP,
    boolean: true,
  },
  lint: {
    describe: 'Lint package artifacts after running script(s)',
    group: BEHAVIOR_GROUP,
    boolean: true,
    defaultDescription: 'true',
  },
  loose: {
    alias: 'if-present',
    describe: 'Ignore missing scripts (use with workspaces)',
    boolean: true,
    group: BEHAVIOR_GROUP,
  },
} as const satisfies SmokerYargsOptions;

type RunScriptOptionTypes = GlobalOptionTypes &
  InferredOptionTypes<typeof RunScriptOptions>;

export class RunScriptCommand extends BaseCommand<RunScriptOptionTypes> {
  override aliases = ['run'];
  override command = 'run-script <script..>';
  override describe = 'Run custom script(s) against package artifacts';

  override async handler(
    opts: ArgumentsCamelCase<CommonOptionTypes>,
  ): Promise<void> {
    try {
      const smoker = await Smoker.create(opts);
      debug('Final options: %O', smoker.opts);
      await smoker.smoke();
    } catch (err) {
      // TODO: generally the exit reporter should handle this, but what if it doesn't exist yet?
      process.exitCode = 1;
      handleRejection(err, opts.verbose, opts.json);
    }
  }

  override builder(argv: Argv<GlobalOptionTypes>): Argv<RunScriptOptionTypes> {
    return argv
      .positional('script', {
        describe: 'Custom script(s) to run (from package.json)',
        string: true,
        coerce: castArray<string>,
        array: true,
      })
      .demandOption('script')
      .options(RunScriptOptions)
      .middleware(enableVerboseMiddleware);
  }
}
