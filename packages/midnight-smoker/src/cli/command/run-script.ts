/**
 * Defines the `run-script` command using {@link RunScriptCommand}
 *
 * @packageDocumentation
 */

import Debug from 'debug';
import type {
  ArgumentsCamelCase,
  Argv,
  InferredOptionTypes,
  Options,
} from 'yargs';
import {castArray} from '../../schema-util';
import {Smoker} from '../../smoker';
import type {CommonOptionTypes, GlobalOptionTypes} from '../cli-options';
import {ARRAY_OPT_CFG, CommonOptions} from '../cli-options';
import {handleRejection} from '../cli-util';
import {BaseCommand} from './base';

const debug = Debug('midnight-smoker:cli:lint');

const BEHAVIOR_GROUP = 'Script Behavior:';

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
} as const satisfies Record<string, Options>;

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
      .options(RunScriptOptions);
  }
}
