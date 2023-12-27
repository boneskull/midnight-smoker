import Debug from 'debug';
import {ArgumentsCamelCase, Argv} from 'yargs';
import {Smoker} from '../../smoker';
import {
  CommonOptionTypes,
  CommonOptions,
  GlobalOptionTypes,
} from '../cli-options';
import {BaseCommand} from './base';

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

  override builder(argv: Argv<GlobalOptionTypes>) {
    return argv.options(CommonOptions);
  }
}
