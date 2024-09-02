/**
 * Defines the `run-script` command using {@link RunScriptCommand}
 *
 * @packageDocumentation
 */
import {handleRejection} from '#cli/cli-util';
import {Smoker} from '#smoker';
import {createDebug} from '#util/debug';
import {castArray} from '#util/util';
import {
  type ArgumentsCamelCase,
  type Argv,
  type InferredOptionTypes,
} from 'yargs';

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
        array: true,
        coerce: castArray<string>,
        describe: 'Custom script(s) to run (from package.json)',
        string: true,
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
      debug('Running scripts...');
      await smoker.smoke();
    } catch (err) {
      // TODO: generally the exit reporter should handle this, but what if it doesn't exist yet?
      process.exitCode = 1;
      debug(err);
      handleRejection(err, opts.verbose, opts.json);
    }
  }
}

const debug = createDebug(__filename);

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
    boolean: true,
    describe: 'Halt on first error',
    group: BEHAVIOR_GROUP,
  },
  lint: {
    boolean: true,
    defaultDescription: 'true',
    describe: 'Lint package artifacts after running script(s)',
    group: BEHAVIOR_GROUP,
  },
  loose: {
    alias: 'if-present',
    boolean: true,
    describe: 'Ignore missing scripts (use with workspaces)',
    group: BEHAVIOR_GROUP,
  },
} as const satisfies CommandOptionRecord;
