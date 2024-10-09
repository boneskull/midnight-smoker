import {Smoker} from '#smoker';
import {createDebug} from '#util/debug';
import {type ArgumentsCamelCase, type Argv} from 'yargs';

import {BaseCommand} from './base-cmd';
import {
  CommonOptions,
  type CommonOptionTypes,
  enableVerboseMiddleware,
} from './common';
import {type GlobalOptionTypes} from './global-opts';

const debug = createDebug(__filename);

export class LintCommand extends BaseCommand<CommonOptionTypes> {
  public override aliases = ['lint'];

  public override command = '*';

  public override describe = 'Lint package artifacts';

  public override builder(
    argv: Argv<GlobalOptionTypes>,
  ): Argv<CommonOptionTypes> {
    return argv.options(CommonOptions).middleware(enableVerboseMiddleware);
  }

  public override async handler(
    opts: ArgumentsCamelCase<CommonOptionTypes>,
  ): Promise<void> {
    const smoker = await Smoker.create(opts);
    debug('Running lint...');
    await smoker.smoke();
    debug('Lint complete');
  }
}
