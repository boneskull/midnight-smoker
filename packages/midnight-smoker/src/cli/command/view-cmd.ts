/**
 * Provides the {@link ViewCommand `view` command} used to view...stuff.
 *
 * @packageDocumentation
 */

import {bold} from 'chalk';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {inspect} from 'node:util';
import {type Writable} from 'type-fest';
import {
  type ArgumentsCamelCase,
  type Argv,
  type InferredOptionTypes,
  type PositionalOptions,
} from 'yargs';
import {guessPackageManager} from '../../component/pkg-manager/guesser';
import {Smoker} from '../../smoker';
import {BaseCommand} from './base-cmd';
import {type GlobalOptionTypes} from './global-opts';
import {JsonOptions, type CommandOptionRecord} from './opts';

type ViewOptionTypes = GlobalOptionTypes &
  InferredOptionTypes<Writable<typeof ViewPositionals>> &
  InferredOptionTypes<Writable<typeof ViewOptions>>;

export class ViewCommand extends BaseCommand {
  public override aliases = ['show'];
  public override command = 'view <item>';
  public override describe = 'View information about stuff';

  public static async viewConfig(opts: ArgumentsCamelCase<ViewOptionTypes>) {
    const smoker = await Smoker.create(opts);
    if (opts.json) {
      BaseCommand.writeJson(smoker.opts);
      return;
    }

    BaseCommand.write(inspect(smoker.opts, {depth: 5, colors: true}));
  }

  public static async viewDefaultPkgManager(
    opts: ArgumentsCamelCase<ViewOptionTypes>,
  ) {
    const smoker = await Smoker.create(opts);
    const pkgManagerDefs = smoker.getPkgManagerDefs();
    const pkgManager = await guessPackageManager(pkgManagerDefs);

    if (opts.json) {
      BaseCommand.writeJson(pkgManager);
      return;
    }
    BaseCommand.write(pkgManager);
  }

  public override builder(
    argv: Argv<GlobalOptionTypes>,
  ): Argv<ViewOptionTypes> {
    return argv
      .positional('item', ViewPositionals.item)
      .demandOption('item')
      .options(ViewOptions).epilog(`Items:

- ${bold(
      Items.defaultPkgManager,
    )}: The package manager \`smoker\` will use by default
- ${bold(Items.config)}: The effective configuration

`);
  }

  public override async handler(opts: ArgumentsCamelCase<ViewOptionTypes>) {
    switch (opts.item) {
      case Items.defaultPkgManager: {
        await ViewCommand.viewDefaultPkgManager(opts);
        return;
      }
      case Items.config: {
        await ViewCommand.viewConfig(opts);
        return;
      }
      default:
        throw new TypeError(`Unknown view item "${opts.item}"`);
    }
  }
}

/**
 * The "items" which can be viewed
 */
const Items = {
  defaultPkgManager: 'default-pkg-manager',
  config: 'config',
} as const;
/**
 * The positional options for the "view" command
 */
const ViewPositionals = {
  item: {
    describe: 'Item to view',
    choices: [Items.defaultPkgManager, Items.config],
    type: 'string',
  },
} as const satisfies Record<string, PositionalOptions>;
/**
 * The option-options for the "view" command
 */
const ViewOptions = {
  ...JsonOptions,
} as const satisfies CommandOptionRecord;
