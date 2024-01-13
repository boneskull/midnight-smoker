import Debug from 'debug';
import type {ArgumentsCamelCase, Argv} from 'yargs';
import {Smoker} from '../../smoker';
import {BaseCommand} from './base';
import type {CommonOptionTypes, GlobalOptionTypes} from './common';
import {CommonOptions, enableVerboseMiddleware} from './common';

const debug = Debug('midnight-smoker:cli:lint');

export class LintCommand extends BaseCommand<CommonOptionTypes> {
  override aliases = ['lint'];
  override command = '*';
  override describe = 'Lint package artifacts';

  override async handler(
    opts: ArgumentsCamelCase<CommonOptionTypes>,
  ): Promise<void> {
    const smoker = await Smoker.create(opts);
    debug('Final options: %O', smoker.opts);
    await smoker.lint();
  }

  override builder(argv: Argv<GlobalOptionTypes>): Argv<CommonOptionTypes> {
    return argv.options(CommonOptions).middleware(enableVerboseMiddleware);
  }
}
