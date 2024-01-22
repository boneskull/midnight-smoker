/**
 * Defines the `run-script` command using {@link RunScriptCommand}
 *
 * @packageDocumentation
 */
import Debug from 'debug';
import type {ArgumentsCamelCase, Argv, InferredOptionTypes} from 'yargs';
import {Smoker} from '../../smoker';
import {castArray} from '../../util/schema-util';
import {handleRejection} from '../cli-util';
import {BaseCommand} from './base-cmd';
import {CommonOptions, enableVerboseMiddleware} from './common';
import {type GlobalOptionTypes} from './global-opts';
import {ARRAY_OPT_CFG, type CommandOptionRecord} from './opts';

type RunScriptOptionTypes = GlobalOptionTypes &
  InferredOptionTypes<typeof RunScriptOptions>;

export class RunScriptCommand extends BaseCommand<RunScriptOptionTypes> {
  public override aliases = ['run'];
  public override command = 'run-script <script..>';
  public override describe = 'Run custom script(s) against package artifacts';

  public override builder(
    argv: Argv<GlobalOptionTypes>,
  ): Argv<RunScriptOptionTypes> {
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

  public override async handler(
    opts: ArgumentsCamelCase<RunScriptOptionTypes>,
  ): Promise<void> {
    try {
      const smoker = await Smoker.create(opts);
      debug('Final options: %O', smoker.opts);
      await smoker.smoke();
    } catch (err) {
      // TODO: generally the exit reporter should ha ndle this, but what if it doesn't exist yet?
      process.exitCode = 1;
      handleRejection(err, opts.verbose, opts.json);
    }
  }
}

const debug = Debug('midnight-smoker:cli:run-script');

/**
 * Group for options that affect the behavior of the `run-script` command
 */
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
} as const satisfies CommandOptionRecord;
