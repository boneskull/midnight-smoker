import {Smoker} from '#smoker';
import Debug from 'debug';
import type {ArgumentsCamelCase, Argv} from 'yargs';
import {BaseCommand} from './base-cmd';
import {
  CommonOptions,
  enableVerboseMiddleware,
  type CommonOptionTypes,
} from './common';
import type {GlobalOptionTypes} from './global-opts';

const debug = Debug('midnight-smoker:cli:lint');

export class LintCommand extends BaseCommand<CommonOptionTypes> {
  override aliases = ['lint'];
  override command = '*';
  override describe = 'Lint package artifacts';

  override async handler(
    opts: ArgumentsCamelCase<CommonOptionTypes>,
  ): Promise<void> {
    const smoker = await Smoker.create(opts);
    debug('Running lint...');
    await smoker.lint();
  }

  override builder(argv: Argv<GlobalOptionTypes>): Argv<CommonOptionTypes> {
    return argv.options(CommonOptions).middleware(enableVerboseMiddleware);
  }
}
